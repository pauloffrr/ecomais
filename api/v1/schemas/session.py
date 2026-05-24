"""
Pydantic schemas for session start and response.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from models import SessionStatus


class SessionStartRequest(BaseModel):
    bin_code: str = Field(..., min_length=1, max_length=50)


class SessionResponse(BaseModel):
    id: int
    session_token: str
    user_id: int
    bin_id: int
    status: SessionStatus
    started_at: datetime
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)