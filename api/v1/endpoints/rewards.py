"""
Reward and leaderboard endpoints.
"""

import logging
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.dependencies import get_current_active_user
from api.v1.schemas.reward import (
    LeaderboardEntry,
    LeaderboardResponse,
    RewardHistoryItem,
    RewardHistoryResponse,
    RewardRedemptionResponse,
)
from database import get_db
from models import Reward, User

logger = logging.getLogger(__name__)
router = APIRouter()

REWARD_CATALOG = {
    "monthly-transit-pass": ("Passe Livre Mensal", 1200),
    "plant-ten-trees": ("Plantar 10 Arvores", 450),
    "free-coffee": ("Cafe Gratis", 150),
    "ifood-20-off": ("20% OFF em Pedido", 250),
    "uber-15-off": ("R$15 OFF na Corrida", 800),
    "mercado-livre-free-shipping": ("Frete Gratis", 500),
    "outback-dessert": ("Sobremesa Gratis", 300),
    "natura-sustainable-off": ("15% OFF Sustentavel", 600),
    "spotify-premium-month": ("1 Mes Premium", 1000),
    "bike-itau-one-hour": ("1 Hora Gratis", 100),
    "tok-stok-25-off": ("R$25 OFF", 750),
}


def _generate_coupon_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    first = "".join(secrets.choice(alphabet) for _ in range(4))
    second = "".join(secrets.choice(alphabet) for _ in range(4))
    return f"ECO-{first}-{second}"


def _mask_username(username: str) -> str:
    if not username:
        return "***"
    if len(username) <= 2:
        return f"{username[0]}*" if len(username) == 2 else "***"
    return f"{username[:2]}***{username[-1]}"


@router.get("/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .order_by(User.total_points.desc(), User.total_discards.desc(), User.created_at.asc())
        .limit(limit)
        .all()
    )

    items = [
        LeaderboardEntry(
            rank=index,
            username=_mask_username(user.username),
            total_points=user.total_points,
            total_discards=user.total_discards,
        )
        for index, user in enumerate(users, start=1)
    ]

    return LeaderboardResponse(items=items)


@router.get("/history", response_model=RewardHistoryResponse)
def get_reward_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(Reward).filter(Reward.user_id == current_user.id)
    total = query.count()
    rewards = query.order_by(Reward.created_at.desc()).offset(skip).limit(limit).all()

    items = [
        RewardHistoryItem(
            id=reward.id,
            points=reward.points,
            transaction_type=reward.transaction_type,
            description=reward.description,
            created_at=reward.created_at,
        )
        for reward in rewards
    ]

    return RewardHistoryResponse(items=items, total=total)


@router.post("/redeem/{reward_id}", response_model=RewardRedemptionResponse)
def redeem_reward(
    reward_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    catalog_item = REWARD_CATALOG.get(reward_id)
    if not catalog_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reward not found",
        )

    title, points_required = catalog_item
    user = (
        db.query(User)
        .filter(User.id == current_user.id)
        .with_for_update()
        .one()
    )

    if user.total_points < points_required:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient points",
        )

    coupon_code = _generate_coupon_code()
    user.total_points -= points_required
    transaction = Reward(
        user_id=user.id,
        points=-points_required,
        transaction_type="redemption",
        description=f"Resgate: {title} ({coupon_code})",
    )
    db.add(transaction)

    try:
        db.commit()
        db.refresh(transaction)
    except Exception:
        db.rollback()
        logger.exception("Failed to redeem reward %s for user %s", reward_id, user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not complete reward redemption",
        )

    return RewardRedemptionResponse(
        reward_id=reward_id,
        title=title,
        points_spent=points_required,
        remaining_points=user.total_points,
        coupon_code=coupon_code,
        transaction=RewardHistoryItem.model_validate(transaction),
    )
