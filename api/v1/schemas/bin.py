"""
Pydantic schemas for bin endpoints
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional


class BinUploadRequest(BaseModel):
    """Request schema for /v1/bin/upload endpoint"""

    session_token: str = Field(..., description="Active session token from QR scan")
    weight_grams: float = Field(..., gt=0, description="Weight measured by load cell (grams)")
    image: str = Field(..., description="Base64 encoded image from ESP32-CAM")

    @field_validator("weight_grams")
    @classmethod
    def validate_weight(cls, v):
        if v < 1 or v > 50000:  # 50kg max
            raise ValueError("Weight must be between 1g and 50kg")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "session_token": "abc123xyz...",
                "weight_grams": 245.5,
                "image": "iVBORw0KGgoAAAANSUhEUgAAAAUA..."
            }
        }


class BinUploadResponse(BaseModel):
    """Response schema for /v1/bin/upload endpoint"""

    success: bool
    message: str
    discard_id: Optional[int] = None
    processing_status: str = Field(
        default="pending",
        description="AI processing status: pending, completed, failed"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Upload received. Processing in background.",
                "discard_id": 123,
                "processing_status": "pending"
            }
        }


class BinHeartbeatRequest(BaseModel):
    """Request schema for bin health check"""

    firmware_version: str
    current_load_kg: float = Field(..., ge=0)
    status: str = Field(default="active")

    class Config:
        json_schema_extra = {
            "example": {
                "firmware_version": "1.0.0",
                "current_load_kg": 12.5,
                "status": "active"
            }
        }


class BinHeartbeatResponse(BaseModel):
    """Response schema for bin heartbeat"""

    success: bool
    message: str
    server_time: str

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Heartbeat received",
                "server_time": "2026-03-26T13:30:00Z"
            }
        }
