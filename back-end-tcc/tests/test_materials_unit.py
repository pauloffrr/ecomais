from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from api.v1.endpoints.materials import (
    create_material,
    delete_material,
    get_material,
    update_material,
)
from api.v1.schemas.material import MaterialCreate, MaterialUpdate
from models import Material, MaterialCategory, User


@pytest.fixture
def current_user():
    return User(id=1, is_active=True)


@pytest.fixture
def material_payload():
    return MaterialCreate(
        name="PET Bottle",
        category=MaterialCategory.PLASTIC,
        points_per_kg=120,
        min_weight_grams=10,
        ai_class_name="plastic_pet",
        confidence_threshold=0.75,
        description="Clear PET bottle",
    )


@pytest.mark.unit
def test_create_material_rejects_duplicate(material_payload, current_user):
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = Material(id=10)

    with pytest.raises(HTTPException) as error:
        create_material(material_payload, current_user=current_user, db=db)

    assert error.value.status_code == 400
    assert "already exists" in error.value.detail
    db.add.assert_not_called()
    db.commit.assert_not_called()


@pytest.mark.unit
def test_get_material_returns_404_when_not_found(current_user):
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None

    with pytest.raises(HTTPException) as error:
        get_material(999, current_user=current_user, db=db)

    assert error.value.status_code == 404
    assert error.value.detail == "Material not found"


@pytest.mark.unit
def test_update_material_rejects_duplicate_name(current_user):
    material = Material(
        id=1,
        name="PET Bottle",
        category=MaterialCategory.PLASTIC,
        points_per_kg=120,
        min_weight_grams=10,
        ai_class_name="plastic_pet",
        confidence_threshold=0.75,
    )
    duplicate = Material(id=2, name="Aluminum Can")
    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [material, duplicate]

    with pytest.raises(HTTPException) as error:
        update_material(
            1,
            MaterialUpdate(name="Aluminum Can"),
            current_user=current_user,
            db=db,
        )

    assert error.value.status_code == 400
    assert "name already exists" in error.value.detail
    assert material.name == "PET Bottle"
    db.commit.assert_not_called()


@pytest.mark.unit
def test_delete_material_performs_soft_delete(current_user):
    material = Material(id=1, name="PET Bottle", is_active=True)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = material

    result = delete_material(1, current_user=current_user, db=db)

    assert result is None
    assert material.is_active is False
    db.commit.assert_called_once_with()
    db.delete.assert_not_called()

