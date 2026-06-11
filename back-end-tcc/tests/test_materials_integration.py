import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.dependencies import get_current_active_user
from database import get_db
from main import app
from models import Base, User


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
def client(db_session):
    user = User(
        id=1,
        email="materials-test@ecomais.com",
        username="materials_test",
        cpf="52998224725",
        password_hash="test",
        full_name="Materials Test",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()

    def override_get_db():
        yield db_session

    def override_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = override_current_user
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.mark.integration
def test_material_crud_complete_lifecycle(client):
    payload = {
        "name": "PET Bottle",
        "category": "plastic",
        "points_per_kg": 120,
        "min_weight_grams": 10,
        "ai_class_name": "plastic_pet",
        "confidence_threshold": 0.75,
        "is_recyclable": True,
        "description": "Clear PET bottle",
        "is_active": True,
    }

    create_response = client.post("/v1/materials", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    material_id = created["id"]
    assert created["name"] == "PET Bottle"

    list_response = client.get("/v1/materials")
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert list_response.json()["materials"][0]["id"] == material_id

    get_response = client.get(f"/v1/materials/{material_id}")
    assert get_response.status_code == 200
    assert get_response.json()["ai_class_name"] == "plastic_pet"

    update_response = client.put(
        f"/v1/materials/{material_id}",
        json={
            "name": "Recycled PET Bottle",
            "points_per_kg": 150,
            "description": "Updated material",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Recycled PET Bottle"
    assert update_response.json()["points_per_kg"] == 150

    delete_response = client.delete(f"/v1/materials/{material_id}")
    assert delete_response.status_code == 204

    active_list_response = client.get("/v1/materials")
    assert active_list_response.status_code == 200
    assert active_list_response.json() == {"materials": [], "total": 0}

    complete_list_response = client.get("/v1/materials", params={"active_only": False})
    assert complete_list_response.status_code == 200
    assert complete_list_response.json()["total"] == 1
    assert complete_list_response.json()["materials"][0]["is_active"] is False


@pytest.mark.integration
def test_material_api_validates_payload_and_unique_fields(client):
    invalid_response = client.post(
        "/v1/materials",
        json={
            "name": "",
            "category": "plastic",
            "points_per_kg": 0,
            "min_weight_grams": -1,
            "ai_class_name": "",
            "confidence_threshold": 2,
        },
    )
    assert invalid_response.status_code == 422

    payload = {
        "name": "Aluminum Can",
        "category": "metal",
        "points_per_kg": 200,
        "min_weight_grams": 15,
        "ai_class_name": "metal_aluminum",
        "confidence_threshold": 0.85,
    }
    assert client.post("/v1/materials", json=payload).status_code == 201

    duplicate_response = client.post(
        "/v1/materials",
        json={**payload, "name": "Another Aluminum Can"},
    )
    assert duplicate_response.status_code == 400
    assert "already exists" in duplicate_response.json()["detail"]
