"""
Pydantic schemas for discard history.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DiscardHistoryItem(BaseModel):
    id: int
    session_id: int
    weight_grams: float
    points_awarded: int
    is_validated: bool
    validation_status: str
    vision_validated: bool
    flagged_as_suspicious: bool
    ai_classification: str | None = None
    ai_confidence: float | None = None
    validation_errors: str | None = None
    created_at: datetime
    material_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class DiscardHistoryResponse(BaseModel):
    items: list[DiscardHistoryItem]
    total: int
