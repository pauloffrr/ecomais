"""
Material catalog endpoints.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.dependencies import get_current_active_user
from api.v1.schemas.material import (
    MaterialCreate,
    MaterialListResponse,
    MaterialResponse,
    MaterialUpdate,
)
from database import get_db
from models import Material, User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=MaterialListResponse)
def list_materials(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = True,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(Material)
    if active_only:
        query = query.filter(Material.is_active.is_(True))

    total = query.count()
    materials = query.order_by(Material.name.asc()).offset(skip).limit(limit).all()

    return MaterialListResponse(
        materials=[MaterialResponse.model_validate(material) for material in materials],
        total=total,
    )


@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(
    material_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    return MaterialResponse.model_validate(material)


@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    payload: MaterialCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    existing_material = db.query(Material).filter(
        (Material.name == payload.name) | (Material.ai_class_name == payload.ai_class_name)
    ).first()
    if existing_material:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A material with this name or ai_class_name already exists",
        )

    material = Material(
        name=payload.name,
        category=payload.category,
        points_per_kg=payload.points_per_kg,
        min_weight_grams=payload.min_weight_grams,
        ai_class_name=payload.ai_class_name,
        confidence_threshold=payload.confidence_threshold,
        is_recyclable=payload.is_recyclable,
        description=payload.description,
        is_active=payload.is_active,
    )

    try:
        db.add(material)
        db.commit()
        db.refresh(material)
    except IntegrityError:
        db.rollback()
        logger.warning("Material creation failed due to a unique constraint violation")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create material because the name or ai_class_name already exists",
        )

    return MaterialResponse.model_validate(material)


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int,
    payload: MaterialUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    if payload.name is not None and payload.name != material.name:
        duplicate_name = db.query(Material).filter(Material.name == payload.name, Material.id != material_id).first()
        if duplicate_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A material with this name already exists")
        material.name = payload.name

    if payload.ai_class_name is not None and payload.ai_class_name != material.ai_class_name:
        duplicate_class = db.query(Material).filter(
            Material.ai_class_name == payload.ai_class_name,
            Material.id != material_id,
        ).first()
        if duplicate_class:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A material with this ai_class_name already exists")
        material.ai_class_name = payload.ai_class_name

    if payload.category is not None:
        material.category = payload.category

    if payload.points_per_kg is not None:
        material.points_per_kg = payload.points_per_kg

    if payload.min_weight_grams is not None:
        material.min_weight_grams = payload.min_weight_grams

    if payload.confidence_threshold is not None:
        material.confidence_threshold = payload.confidence_threshold

    if payload.is_recyclable is not None:
        material.is_recyclable = payload.is_recyclable

    if payload.description is not None:
        material.description = payload.description

    if payload.is_active is not None:
        material.is_active = payload.is_active

    try:
        db.commit()
        db.refresh(material)
    except IntegrityError:
        db.rollback()
        logger.warning("Material update failed due to a unique constraint violation")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to update material because a unique field already exists",
        )

    return MaterialResponse.model_validate(material)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    material.is_active = False
    db.commit()
    return None
