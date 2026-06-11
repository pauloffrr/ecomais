"""
Pydantic schemas for discard history.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DiscardHistoryItem(BaseModel):
    id: int
    weight_grams: float
    points_awarded: int
    is_validated: bool
    created_at: datetime
    material_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DiscardHistoryResponse(BaseModel):
    items: list[DiscardHistoryItem]
    total: int
