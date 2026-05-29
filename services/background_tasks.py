"""
Background Tasks Service - MVP Version
Uses FastAPI's native BackgroundTasks for async processing

For production scaling, consider migrating to Celery + Redis
"""

import logging
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


# ==================== IMAGE PROCESSING ====================

def save_image_to_disk(image_base64: str, discard_id: int) -> str:
    """
    Save uploaded image to local filesystem.
    Returns the file path.

    Args:
        image_base64: Base64 encoded image string
        discard_id: Discard record ID for filename

    Returns:
        str: Path to saved image file
    """
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path(settings.LOCAL_STORAGE_PATH)
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Decode base64 image
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))

        # Converte PNG com transparência (RGBA) para RGB, pois JPEG não suporta canal Alpha
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")

        # Generate filename with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"discard_{discard_id}_{timestamp}.jpg"
        filepath = upload_dir / filename

        # Save image with compression
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
    """
    Background task: Process image with AI classification.
    Updates the discard record with AI results and awards points if validated.

    This runs asynchronously after returning 200 OK to the ESP32.

    Args:
        discard_id: Discard record ID to update
        image_path: Path to the saved image file
        db: Database session
    """
    try:
        logger.info(f"Starting AI processing for discard {discard_id}")

        # Get the discard record
        discard = db.query(Discard).filter(Discard.id == discard_id).first()
        if not discard:
            logger.error(f"Discard {discard_id} not found")
            return

        # TODO: Replace with actual AI model inference
        # For MVP, using mock classification (85% confidence, plastic_pet)
        ai_result = mock_ai_classification(image_path)

        # Update discard with AI results
        discard.ai_classification = ai_result["class_name"]
        discard.ai_confidence = ai_result["confidence"]

        # Find matching material
        material = db.query(Material).filter(
            Material.ai_class_name == ai_result["class_name"]
        ).first()

        if not material:
            logger.warning(f"No material found for class {ai_result['class_name']}")
            discard.vision_validated = False
            discard.validation_errors = "Material class not found in database"
            db.commit()
            return

        # Validate AI confidence threshold
        if ai_result["confidence"] < material.confidence_threshold:
            logger.warning(
                f"AI confidence {ai_result['confidence']} below threshold "
                f"{material.confidence_threshold} for {material.name}"
            )
            discard.vision_validated = False
            discard.validation_errors = f"AI confidence too low: {ai_result['confidence']}"

            # Flag for manual review if close to threshold
            if ai_result["confidence"] >= settings.MANUAL_REVIEW_CONFIDENCE_THRESHOLD:
                discard.flagged_as_suspicious = True
                logger.info(f"Discard {discard_id} flagged for manual review")

            db.commit()
            return

        # AI validation passed
        discard.vision_validated = True
        discard.material_id = material.id

        # Check if all validations passed (session, weight, vision)
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
                user.total_points += points
                user.total_discards += 1
                logger.info(
                    f"Awarded {points} points to user {user.id}. "
                    f"New total: {user.total_points}"
                )

            discard.points_applied = True

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
                db.commit()
        except:
            pass


def mock_ai_classification(image_path: str) -> dict:
    """
    Mock AI classification for MVP development.
    Replace this with actual YOLOv8 model inference.

    Returns:
        dict: {"class_name": str, "confidence": float}
    """
    # TODO: Replace with real YOLOv8 model
    # Example implementation:
    #
    # from ultralytics import YOLO
    # import cv2
    #
    # # Load model (do this once at startup, not per request!)
    # model = YOLO(settings.AI_MODEL_PATH)  # e.g., 'ml/models/recyclable_classifier.pt'
    #
    # # Read and preprocess image
    # image = cv2.imread(image_path)
    # image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    #
    # # Run inference
    # results = model(image, verbose=False)
    #
    # # Extract top prediction
    # probs = results[0].probs  # Classification probabilities
    # class_idx = probs.top1  # Index of top class
    # confidence = float(probs.top1conf)  # Confidence of top class
    # class_name = model.names[class_idx]  # Class name
    #
    # return {
    #     "class_name": class_name,
    #     "confidence": confidence
    # }

    # For now, return mock data (85% confidence PET plastic)
    logger.warning("Using MOCK AI classification - replace with YOLOv8 model!")
    return {
        "class_name": "plastic_pet",
        "confidence": 0.85
    }


# ==================== SESSION CLEANUP ====================

def cleanup_expired_sessions(db: Session):
    """
    Background task: Mark expired sessions as EXPIRED.
    Called periodically or on-demand during session validation.

    For MVP: Called on each /sessions/start or /bin/upload request
    For Production: Run as scheduled Celery task every 30 seconds
    """
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


# ==================== IMAGE CLEANUP ====================

def cleanup_old_images():
    """
    Background task: Delete images older than retention period.

    For MVP: Run manually or via cron job
    For Production: Run as scheduled Celery task daily
    """
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
    """
    Check if user has submitted a similar image recently (within 24h).
    Uses perceptual hashing (pHash) to detect duplicates.

    For MVP: Simple implementation
    For Production: Consider using imagehash library or Redis cache

    Args:
        user_id: User ID to check
        image_path: Path to the image to check
        db: Database session

    Returns:
        bool: True if duplicate detected, False otherwise
    """
    try:
        # TODO: Implement perceptual hashing
        # For MVP, skip duplicate detection (return False)
        #
        # Example production implementation:
        # import imagehash
        # from PIL import Image
        #
        # current_hash = imagehash.phash(Image.open(image_path))
        #
        # recent_discards = db.query(Discard).filter(
        #     Discard.user_id == user_id,
        #     Discard.created_at > datetime.utcnow() - timedelta(hours=24)
        # ).all()
        #
        # for discard in recent_discards:
        #     if discard.image_path:
        #         prev_hash = imagehash.phash(Image.open(discard.image_path))
        #         if current_hash - prev_hash < 5:  # Hamming distance < 5
        #             return True

        return False

    except Exception as e:
        logger.error(f"Error checking duplicate image: {e}")
        return False
