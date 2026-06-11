"""
Pydantic schemas for the material catalog.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from models import MaterialCategory


class MaterialBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: MaterialCategory
    points_per_kg: float = Field(..., gt=0)
    min_weight_grams: int = Field(..., ge=0)
    ai_class_name: str = Field(..., min_length=1, max_length=100)
    confidence_threshold: float = Field(..., ge=0, le=1)
    is_recyclable: bool = True
    description: str | None = None
    is_active: bool = True


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    category: MaterialCategory | None = None
    points_per_kg: float | None = Field(default=None, gt=0)
    min_weight_grams: int | None = Field(default=None, ge=0)
    ai_class_name: str | None = Field(default=None, min_length=1, max_length=100)
    confidence_threshold: float | None = Field(default=None, ge=0, le=1)
    is_recyclable: bool | None = None
    description: str | None = None
    is_active: bool | None = None


class MaterialResponse(MaterialBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class MaterialListResponse(BaseModel):
    materials: list[MaterialResponse]
    total: int
