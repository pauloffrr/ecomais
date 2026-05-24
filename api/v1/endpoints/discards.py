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
            Discard.weight_grams,
            Discard.points_awarded,
            Discard.is_validated,
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
            weight_grams=row.weight_grams,
            points_awarded=row.points_awarded,
            is_validated=row.is_validated,
            created_at=row.created_at,
            material_name=row.material_name,
        )
        for row in rows
    ]

    return DiscardHistoryResponse(items=items, total=total)
