"""
Discard history endpoints.
"""

import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.dependencies import get_current_active_user
from api.v1.schemas.discard import DiscardHistoryItem, DiscardHistoryResponse
from database import get_db
from models import Discard, Material, User

logger = logging.getLogger(__name__)
router = APIRouter()


def get_discard_validation_status(discard: Discard) -> str:
    if discard.flagged_as_suspicious and not discard.admin_reviewed:
        return "manual_review"
    if discard.is_validated and discard.vision_validated and discard.points_applied:
        return "approved"
    if discard.validated_at is not None or discard.validation_errors:
        return "rejected"
    return "pending"


@router.get("/history", response_model=DiscardHistoryResponse)
def get_discard_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    total = db.query(Discard).filter(Discard.user_id == current_user.id).count()

    material_name = func.coalesce(Material.name, "Pendente").label("material_name")
    rows = (
        db.query(
            Discard.id,
            Discard.session_id,
            Discard.weight_grams,
            Discard.points_awarded,
            Discard.is_validated,
            Discard.vision_validated,
            Discard.flagged_as_suspicious,
            Discard.admin_reviewed,
            Discard.ai_classification,
            Discard.ai_confidence,
            Discard.validation_errors,
            Discard.validated_at,
            Discard.points_applied,
            Discard.created_at,
            material_name,
        )
        .outerjoin(Material, Discard.material_id == Material.id)
        .filter(Discard.user_id == current_user.id)
        .order_by(Discard.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = [
        DiscardHistoryItem(
            id=row.id,
            session_id=row.session_id,
            weight_grams=row.weight_grams,
            points_awarded=row.points_awarded,
            is_validated=row.is_validated,
            validation_status=get_discard_validation_status(row),
            vision_validated=row.vision_validated,
            flagged_as_suspicious=row.flagged_as_suspicious,
            ai_classification=row.ai_classification,
            ai_confidence=row.ai_confidence,
            validation_errors=row.validation_errors,
            created_at=row.created_at,
            material_name=row.material_name,
        )
        for row in rows
    ]

    return DiscardHistoryResponse(items=items, total=total)
