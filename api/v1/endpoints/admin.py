"""
Admin panel endpoints.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.dependencies import get_current_admin_user
from api.v1.schemas.admin import (
    FlaggedDiscardListResponse,
    FlaggedDiscardResponse,
    ResolveDiscardRequest,
    SmartBinAdminListResponse,
    SmartBinAdminResponse,
)
from database import get_db
from models import BinStatus, Discard, Material, Reward, SmartBin, User

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(get_current_admin_user)])


def _apply_reward_for_discard(db: Session, discard: Discard) -> None:
    """Apply reward points for a discard if they have not been applied yet."""
    existing_reward = db.query(Reward).filter(Reward.discard_id == discard.id).first()
    if existing_reward or discard.points_applied:
        discard.points_applied = True
        return

    material = discard.material or db.query(Material).filter(Material.id == discard.material_id).first()
    if discard.points_awarded <= 0 and material:
        discard.points_awarded = int((discard.weight_grams / 1000.0) * material.points_per_kg)

    points = discard.points_awarded
    if points <= 0:
        discard.points_applied = False
        return

    reward = Reward(
        user_id=discard.user_id,
        points=points,
        transaction_type="discard",
        discard_id=discard.id,
        description=f"Admin approved discard #{discard.id}",
    )
    db.add(reward)

    user = db.query(User).filter(User.id == discard.user_id).first()
    if user:
        user.total_points += points
        user.total_discards += 1

    discard.points_applied = True


@router.get("/bins", response_model=SmartBinAdminListResponse)
def list_bins(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    query = db.query(SmartBin)
    total = query.count()
    bins = query.order_by(SmartBin.id.asc()).offset(skip).limit(limit).all()

    items = [
        SmartBinAdminResponse(
            id=bin.id,
            bin_code=bin.bin_code,
            location_name=bin.location_name,
            status=bin.status,
            current_load_kg=bin.current_load_kg,
            max_weight_kg=bin.max_weight_kg,
            last_seen_at=bin.last_seen_at,
        )
        for bin in bins
    ]

    return SmartBinAdminListResponse(items=items, total=total)


@router.get("/discards/flagged", response_model=FlaggedDiscardListResponse)
def list_flagged_discards(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    query = db.query(Discard).filter(
        Discard.flagged_as_suspicious.is_(True),
        Discard.admin_reviewed.is_(False),
    )
    total = query.count()
    discards = query.order_by(Discard.created_at.desc()).offset(skip).limit(limit).all()

    items = [
        FlaggedDiscardResponse(
            id=discard.id,
            user_id=discard.user_id,
            bin_id=discard.bin_id,
            weight_grams=discard.weight_grams,
            image_path=discard.image_path,
            ai_confidence=discard.ai_confidence,
            validation_errors=discard.validation_errors,
            created_at=discard.created_at,
        )
        for discard in discards
    ]

    return FlaggedDiscardListResponse(items=items, total=total)


@router.post("/discards/{discard_id}/resolve", response_model=FlaggedDiscardResponse)
def resolve_flagged_discard(
    discard_id: int,
    payload: ResolveDiscardRequest,
    db: Session = Depends(get_db),
):
    discard = db.query(Discard).filter(Discard.id == discard_id).first()
    if not discard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discard not found")

    if payload.reason:
        discard.validation_errors = payload.reason

    discard.admin_reviewed = True

    if payload.approve:
        discard.is_validated = True
        discard.validated_at = datetime.now(timezone.utc)
        _apply_reward_for_discard(db, discard)
    else:
        discard.is_validated = False
        discard.validated_at = None

    db.commit()
    db.refresh(discard)

    return FlaggedDiscardResponse(
        id=discard.id,
        user_id=discard.user_id,
        bin_id=discard.bin_id,
        weight_grams=discard.weight_grams,
        image_path=discard.image_path,
        ai_confidence=discard.ai_confidence,
        validation_errors=discard.validation_errors,
        created_at=discard.created_at,
    )
