"""
Validation Service
Handles triple validation logic (Session + Weight + AI Vision)
"""

import logging
from datetime import datetime
from typing import Tuple, Optional
from sqlalchemy import func

from sqlalchemy.orm import Session

from models import (
    ActiveSession, SessionStatus, Discard, User, SmartBin, Material
)
from config import get_settings
from services.background_tasks import check_duplicate_image

logger = logging.getLogger(__name__)
settings = get_settings()


def validate_session(
    session_token: Optional[str],
    bin_id: int,
    db: Session
) -> Tuple[bool, Optional[ActiveSession], str]:
    """
    Validate that an active session exists and is not expired.

    Args:
        session_token: Session token from request
        bin_id: Smart bin ID
        db: Database session

    Returns:
        Tuple[bool, Optional[ActiveSession], str]:
            - is_valid: True if session valid
            - session: ActiveSession object if found
            - error_message: Error description if invalid
    """
    try:
        if session_token:
            # Find session by token
            session = db.query(ActiveSession).filter(
                ActiveSession.session_token == session_token
            ).first()
        else:
            # Find latest active session by bin_id (O "Matchmaker" entre App e Hardware)
            session = db.query(ActiveSession).filter(
                ActiveSession.bin_id == bin_id,
                ActiveSession.status == SessionStatus.ACTIVE
            ).order_by(ActiveSession.id.desc()).first()

        if not session:
            return False, None, "Nenhuma sessão ativa encontrada para esta lixeira. Escaneie o QR Code no app."

        # Check if session is for the correct bin
        if session.bin_id != bin_id:
            logger.warning(
                f"Session {session.id} bin mismatch: expected {bin_id}, got {session.bin_id}"
            )
            return False, session, "Session bin mismatch"

        # Check if session is active
        if session.status != SessionStatus.ACTIVE:
            return False, session, f"Session is {session.status}"

        # Check if session has expired
        now = datetime.utcnow()
        if now > session.expires_at:
            # Mark as expired
            session.status = SessionStatus.EXPIRED
            db.commit()
            return False, session, f"Session expired at {session.expires_at}"

        # Session is valid
        return True, session, ""

    except Exception as e:
        logger.error(f"Error validating session: {e}")
        return False, None, f"Validation error: {str(e)}"


def validate_weight(
    weight_grams: float,
    user_id: int,
    db: Session
) -> Tuple[bool, str]:
    """
    Validate that weight is within acceptable range and not anomalous.

    Args:
        weight_grams: Weight in grams
        user_id: User ID for anomaly detection
        db: Database session

    Returns:
        Tuple[bool, str]:
            - is_valid: True if weight valid
            - error_message: Error description if invalid
    """
    try:
        # Check minimum weight
        if weight_grams < settings.MIN_WEIGHT_GRAMS:
            return False, f"Weight ({weight_grams}g) below minimum ({settings.MIN_WEIGHT_GRAMS}g)"

        # Check maximum weight (prevent unrealistic items)
        if weight_grams > settings.MAX_WEIGHT_GRAMS:
            return False, f"Weight ({weight_grams}g) exceeds maximum ({settings.MAX_WEIGHT_GRAMS}g)"

        # TODO: Implement anomaly detection based on user history
        # For MVP, skip anomaly detection
        #
        # Example production implementation:
        # user_avg, user_stddev = get_user_weight_stats(user_id, db)
        # z_score = (weight_grams - user_avg) / user_stddev
        # if abs(z_score) > settings.WEIGHT_ANOMALY_THRESHOLD:
        #     return False, f"Weight anomaly detected (Z-score: {z_score:.2f})"

        return True, ""

    except Exception as e:
        logger.error(f"Error validating weight: {e}")
        return False, f"Validation error: {str(e)}"


def check_rate_limits(
    user_id: int,
    session_id: int,
    db: Session
) -> Tuple[bool, str]:
    """
    Check if user has exceeded rate limits for discards.

    Args:
        user_id: User ID
        session_id: Active session ID
        db: Database session

    Returns:
        Tuple[bool, str]:
            - is_allowed: True if within limits
            - error_message: Error description if exceeded
    """
    try:
        # Check discards per session
        session_discard_count = db.query(Discard).filter(
            Discard.session_id == session_id
        ).count()

        if session_discard_count >= settings.MAX_DISCARDS_PER_SESSION:
            return False, f"Maximum {settings.MAX_DISCARDS_PER_SESSION} discards per session"

        # Check discards per day
        from datetime import date
        today = date.today()
        daily_discard_count = db.query(Discard).filter(
            Discard.user_id == user_id,
            func.date(Discard.created_at) == today
        ).count()

        if daily_discard_count >= settings.MAX_DISCARDS_PER_DAY:
            return False, f"Maximum {settings.MAX_DISCARDS_PER_DAY} discards per day"

        return True, ""

    except Exception as e:
        logger.error(f"Error checking rate limits: {e}")
        return False, f"Rate limit check error: {str(e)}"


def create_discard_record(
    session: ActiveSession,
    bin: SmartBin,
    weight_grams: float,
    image_path: str,
    db: Session
) -> Discard:
    """
    Create a new discard record with initial validation status.
    AI validation will be completed in background task.

    Args:
        session: Active session
        bin: Smart bin
        weight_grams: Weight in grams
        image_path: Path to saved image
        db: Database session

    Returns:
        Discard: Created discard record
    """
    try:
        discard = Discard(
            session_id=session.id,
            user_id=session.user_id,
            bin_id=bin.id,
            material_id=None,  # Will be set after AI classification
            weight_grams=weight_grams,
            image_path=image_path,

            # Validation status
            session_validated=True,  # Already validated
            weight_validated=True,   # Already validated
            vision_validated=False,  # Pending AI processing
            is_validated=False,      # Overall validation pending

            # AI fields (will be filled by background task)
            ai_classification=None,
            ai_confidence=None,

            # Points (will be awarded after AI validation)
            points_awarded=0,
            points_applied=False,

            # Fraud detection
            flagged_as_suspicious=False,
            admin_reviewed=False
        )

        db.add(discard)
        db.commit()
        db.refresh(discard)

        logger.info(f"Created discard record {discard.id} for user {session.user_id}")
        return discard

    except Exception as e:
        logger.error(f"Error creating discard record: {e}")
        db.rollback()
        raise


def update_session_validation_status(
    session: ActiveSession,
    weight_validated: bool,
    vision_validated: bool,
    db: Session
):
    """
    Update session validation checkpoints.

    Args:
        session: Active session
        weight_validated: Weight validation status
        vision_validated: Vision validation status
        db: Database session
    """
    try:
        session.weight_validated = weight_validated
        if session.status != SessionStatus.COMPLETED:
            session.vision_validated = vision_validated
        db.commit()
    except Exception as e:
        logger.error(f"Error updating session status: {e}")
        db.rollback()
