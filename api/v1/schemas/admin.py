"""
Pydantic schemas for admin panel endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from models import BinStatus


class SmartBinAdminResponse(BaseModel):
    id: int
    bin_code: str
    location_name: str
    status: BinStatus
    current_load_kg: float
    max_weight_kg: float
    last_seen_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class SmartBinAdminListResponse(BaseModel):
    items: list[SmartBinAdminResponse]
    total: int


class FlaggedDiscardResponse(BaseModel):
    id: int
    user_id: int
    bin_id: int
    weight_grams: float
    image_path: str | None = None
    ai_confidence: float | None = None
    validation_errors: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FlaggedDiscardListResponse(BaseModel):
    items: list[FlaggedDiscardResponse]
    total: int


class ResolveDiscardRequest(BaseModel):
    approve: bool = Field(..., description="True to approve and award points, False to keep invalid")
    reason: str | None = Field(default=None, max_length=500)
