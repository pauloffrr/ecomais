"""
Pydantic schemas for reward history and leaderboard.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RewardHistoryItem(BaseModel):
    id: int
    points: int
    transaction_type: str
    description: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RewardHistoryResponse(BaseModel):
    items: list[RewardHistoryItem]
    total: int


class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    total_points: int
    total_discards: int


class LeaderboardResponse(BaseModel):
    items: list[LeaderboardEntry]
