"""
Session endpoints.
Handles the first step of triple validation: starting a recycle session.
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.dependencies import get_current_active_user
from api.v1.schemas.session import SessionResponse, SessionStartRequest
from config import get_settings
from database import get_db
from models import ActiveSession, BinStatus, SessionStatus, SmartBin, User

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


@router.post("/start", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def start_session(
    payload: SessionStartRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    smart_bin = db.query(SmartBin).filter(SmartBin.bin_code == payload.bin_code).first()
    if not smart_bin or smart_bin.status != BinStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Smart bin not found or inactive")

    active_sessions = (
        db.query(ActiveSession)
        .filter(ActiveSession.user_id == current_user.id, ActiveSession.status == SessionStatus.ACTIVE)
        .all()
    )

    now = datetime.now(timezone.utc)
    for active_session in active_sessions:
        active_session.status = SessionStatus.CANCELLED
        active_session.completed_at = now

    session_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)

    new_session = ActiveSession(
        session_token=session_token,
        user_id=current_user.id,
        bin_id=smart_bin.id,
        status=SessionStatus.ACTIVE,
        started_at=now,
        expires_at=expires_at,
        qr_code_scanned=True,
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return SessionResponse.model_validate(new_session)
