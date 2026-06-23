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
    try:
        if session_token:
            session = db.query(ActiveSession).filter(
                ActiveSession.session_token == session_token
            ).first()
        else:
            session = db.query(ActiveSession).filter(
                ActiveSession.bin_id == bin_id,
                ActiveSession.status == SessionStatus.ACTIVE
            ).order_by(ActiveSession.id.desc()).first()

        if not session:
            return False, None, "Nenhuma sessão ativa encontrada para esta lixeira. Escaneie o QR Code no app."

        if session.bin_id != bin_id:
            logger.warning(
                f"Session {session.id} bin mismatch: expected {bin_id}, got {session.bin_id}"
            )
            return False, session, "Session bin mismatch"

        if session.status != SessionStatus.ACTIVE:
            return False, session, f"Session is {session.status}"

        now = datetime.utcnow()
        if now > session.expires_at:
            session.status = SessionStatus.EXPIRED
            db.commit()
            return False, session, f"Session expired at {session.expires_at}"

        return True, session, ""

    except Exception as e:
        logger.error(f"Error validating session: {e}")
        return False, None, f"Validation error: {str(e)}"


def validate_weight(
    weight_grams: float,
    user_id: int,
    db: Session
) -> Tuple[bool, str]:
    try:
        if weight_grams < settings.MIN_WEIGHT_GRAMS:
            return False, f"Weight ({weight_grams}g) below minimum ({settings.MIN_WEIGHT_GRAMS}g)"

        if weight_grams > settings.MAX_WEIGHT_GRAMS:
            return False, f"Weight ({weight_grams}g) exceeds maximum ({settings.MAX_WEIGHT_GRAMS}g)"

        return True, ""

    except Exception as e:
        logger.error(f"Error validating weight: {e}")
        return False, f"Validation error: {str(e)}"


def check_rate_limits(
    user_id: int,
    session_id: int,
    db: Session
) -> Tuple[bool, str]:
    try:
        session_discard_count = db.query(Discard).filter(
            Discard.session_id == session_id
        ).count()

        if session_discard_count >= settings.MAX_DISCARDS_PER_SESSION:
            return False, f"Maximum {settings.MAX_DISCARDS_PER_SESSION} discards per session"

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
    try:
        discard = Discard(
            session_id=session.id,
            user_id=session.user_id,
            bin_id=bin.id,
            material_id=None,
            weight_grams=weight_grams,
            image_path=image_path,

            session_validated=True,
            weight_validated=True,
            vision_validated=False,
            is_validated=False,

            ai_classification=None,
            ai_confidence=None,

            points_awarded=0,
            points_applied=False,

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
    try:
        session.weight_validated = weight_validated
        if session.status != SessionStatus.COMPLETED:
            session.vision_validated = vision_validated
        db.commit()
    except Exception as e:
        logger.error(f"Error updating session status: {e}")
        db.rollback()
