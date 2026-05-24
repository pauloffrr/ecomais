"""
Reward and leaderboard endpoints.
"""

import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.dependencies import get_current_active_user
from api.v1.schemas.reward import (
    LeaderboardEntry,
    LeaderboardResponse,
    RewardHistoryItem,
    RewardHistoryResponse,
)
from database import get_db
from models import Reward, User

logger = logging.getLogger(__name__)
router = APIRouter()


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
