import os
import sys
from pathlib import Path


# Keep test collection independent from machine-level environment values.
os.environ["DEBUG"] = "false"

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

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
    test_client = TestClient(app)
    try:
        yield test_client
    finally:
        test_client.close()
        app.dependency_overrides.clear()
