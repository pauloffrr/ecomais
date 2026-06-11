import logging
from threading import Lock
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import base64

from sqlalchemy.orm import Session
from PIL import Image
import io

from models import Discard, User, Reward, ActiveSession, SessionStatus, Material
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
ai_inference_lock = Lock()

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

yolo_model = None
if YOLO is not None and settings.ENABLE_AI_CLASSIFICATION:
    model_path = Path(settings.AI_MODEL_PATH)
    if model_path.exists():
        try:
            yolo_model = YOLO(str(model_path))
            logger.info("YOLOv8 model loaded from %s", model_path)
        except Exception as exc:
            logger.warning("Failed to load YOLOv8 model from %s: %s", model_path, exc)
    else:
        logger.warning("YOLOv8 model not found at %s. Using fallback classification.", model_path)
elif YOLO is None:
    logger.warning("Ultralytics is not installed. Using fallback classification.")

if YOLO is None:
    yolo_model = None


# ==================== IMAGE PROCESSING ====================

def save_image_to_disk(image_base64: str, discard_id: int) -> str:

    try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path(settings.LOCAL_STORAGE_PATH)
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Decode base64 image
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))

        if image.mode != "RGB":
            image = image.convert("RGB")

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"discard_{discard_id}_{timestamp}.jpg"
        filepath = upload_dir / filename

        image.save(
            filepath,
            format="JPEG",
            quality=settings.IMAGE_COMPRESSION_QUALITY,
            optimize=True
        )

        logger.info(f"Saved image to {filepath}")
        return str(filepath)

    except Exception as e:
        logger.error(f"Failed to save image for discard {discard_id}: {e}")
        raise


def process_image_with_ai(discard_id: int, image_path: str, db: Session):

    try:
        logger.info(f"Starting AI processing for discard {discard_id}")

        # Get the discard record
        discard = db.query(Discard).filter(Discard.id == discard_id).first()
        if not discard:
            logger.error(f"Discard {discard_id} not found")
            return

        # Executa a inferência real do YOLOv8 na imagem salva
        ai_result = run_ai_classification(image_path)

        discard.ai_classification = ai_result["class_name"]
        discard.ai_confidence = ai_result["confidence"]


        material = db.query(Material).filter(
            Material.ai_class_name == ai_result["class_name"]
        ).first()

        if not material:
            logger.warning(f"No material found for class {ai_result['class_name']}")
            discard.vision_validated = False
            discard.validation_errors = "Material class not found in database"
            discard.is_validated = True  # Tira do status Pendente (Recusado)
            discard.validated_at = datetime.utcnow()
            db.commit()
            return

        if ai_result["confidence"] < material.confidence_threshold:
            logger.warning(
                f"AI confidence {ai_result['confidence']} below threshold "
                f"{material.confidence_threshold} for {material.name}"
            )
            discard.vision_validated = False
            discard.validation_errors = f"AI confidence too low: {ai_result['confidence']}"
            discard.is_validated = True  # Tira do status Pendente (Recusado)
            discard.validated_at = datetime.utcnow()

            # Flag for manual review if close to threshold
            if ai_result["confidence"] >= settings.MANUAL_REVIEW_CONFIDENCE_THRESHOLD:
                discard.flagged_as_suspicious = True
                logger.info(f"Discard {discard_id} flagged for manual review")

            db.commit()
            return

        # AI validation passed
        discard.vision_validated = True
        discard.material_id = material.id

        if (discard.session_validated and
            discard.weight_validated and
            discard.vision_validated):

            # Calculate and award points
            discard.is_validated = True
            discard.validated_at = datetime.utcnow()

            # Points = (weight_kg) * (points_per_kg)
            weight_kg = discard.weight_grams / 1000.0
            points = int(weight_kg * material.points_per_kg)
            discard.points_awarded = points

            # Create reward transaction
            reward = Reward(
                user_id=discard.user_id,
                points=points,
                transaction_type="discard",
                discard_id=discard.id,
                description=f"Recycled {material.name} ({discard.weight_grams}g)"
            )
            db.add(reward)

            # Update user's total points (atomic)
            user = db.query(User).filter(User.id == discard.user_id).first()
            if user:
                user.total_discards += 1
                logger.info(
                    f"Awarded {points} points to user {user.id}."
                )

            discard.points_applied = True

            session = discard.session
            if session:
                session.weight_validated = True
                session.vision_validated = True
                complete_session(session)

        db.commit()
        logger.info(f"AI processing completed for discard {discard_id}")

    except Exception as e:
        logger.error(f"Error processing AI for discard {discard_id}: {e}")
        db.rollback()

        # Update discard with error
        try:
            discard = db.query(Discard).filter(Discard.id == discard_id).first()
            if discard:
                discard.validation_errors = f"AI processing error: {str(e)}"
                discard.is_validated = True # Tira do status Pendente (Recusado por erro)
                discard.validated_at = datetime.utcnow()
                db.commit()
        except:
            pass


def run_ai_classification(image_path: str) -> dict:
    if yolo_model is None:
        logger.warning("YOLOv8 nao carregado! Retornando classe fallback.")
        return {"class_name": "plastic_pet", "confidence": 0.85}

    logger.info("Waiting for AI inference lock: image=%s", image_path)
    try:
        with ai_inference_lock:
            logger.info("AI inference lock acquired: image=%s", image_path)
            results = yolo_model(image_path, verbose=False)
            probs = results[0].probs
            classification = {
                "class_name": yolo_model.names[probs.top1],
                "confidence": float(probs.top1conf),
            }
            logger.info(
                "AI inference completed: image=%s class=%s confidence=%.4f",
                image_path,
                classification["class_name"],
                classification["confidence"],
            )
    finally:
        logger.info("AI inference lock released: image=%s", image_path)

    return classification


# ==================== SESSION CLEANUP ====================

def cleanup_expired_sessions(db: Session):
    try:
        now = datetime.utcnow()

        # Find all expired sessions still marked as ACTIVE
        expired_sessions = db.query(ActiveSession).filter(
            ActiveSession.status == SessionStatus.ACTIVE,
            ActiveSession.expires_at < now
        ).all()

        count = len(expired_sessions)
        if count > 0:
            # Mark as expired
            for session in expired_sessions:
                session.status = SessionStatus.EXPIRED

            db.commit()
            logger.info(f"Marked {count} expired sessions")

    except Exception as e:
        logger.error(f"Error cleaning up expired sessions: {e}")
        db.rollback()


def complete_session(session: ActiveSession):
    """Mark a validated session as completed."""
    if session.status == SessionStatus.COMPLETED:
        return

    session.status = SessionStatus.COMPLETED
    session.completed_at = datetime.utcnow()


# ==================== IMAGE CLEANUP ====================

def cleanup_old_images():
    try:
        upload_dir = Path(settings.LOCAL_STORAGE_PATH)
        if not upload_dir.exists():
            return

        cutoff_date = datetime.utcnow() - timedelta(days=settings.IMAGE_RETENTION_DAYS)
        deleted_count = 0

        # Iterate through image files
        for image_file in upload_dir.glob("discard_*.jpg"):
            # Check file modification time
            file_mtime = datetime.fromtimestamp(image_file.stat().st_mtime)

            if file_mtime < cutoff_date:
                image_file.unlink()
                deleted_count += 1

        if deleted_count > 0:
            logger.info(f"Deleted {deleted_count} old images")

    except Exception as e:
        logger.error(f"Error cleaning up old images: {e}")


# ==================== DUPLICATE IMAGE DETECTION ====================

def check_duplicate_image(user_id: int, image_path: str, db: Session) -> bool:
    try:
        return False

    except Exception as e:
        logger.error(f"Error checking duplicate image: {e}")
        return False
