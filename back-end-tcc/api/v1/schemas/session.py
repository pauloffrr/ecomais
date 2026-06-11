"""
Pydantic schemas for session start and response.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from models import BinStatus, SessionStatus


class SessionStartRequest(BaseModel):
    machine_qr: str | None = Field(default=None, min_length=1, max_length=50)
    bin_code: str | None = Field(default=None, min_length=1, max_length=50)

    @model_validator(mode="after")
    def validate_machine_identifier(self):
        if not self.machine_qr and not self.bin_code:
            raise ValueError("machine_qr or bin_code is required")
        return self


class SessionMachineResponse(BaseModel):
    id: int
    bin_code: str
    location_name: str
    status: BinStatus
    last_seen_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class SessionResponse(BaseModel):
    id: int
    session_token: str
    user_id: int
    bin_id: int
    status: SessionStatus
    started_at: datetime
    expires_at: datetime
    machine: SessionMachineResponse | None = None

    model_config = ConfigDict(from_attributes=True)
