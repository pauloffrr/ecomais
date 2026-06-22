import math
import os
from concurrent.futures import ThreadPoolExecutor
from time import perf_counter

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api.dependencies import get_current_active_user
from database import get_db
from main import app
from models import Base, Material, MaterialCategory, User


REQUEST_COUNT = int(os.getenv("MATERIAL_LOAD_REQUESTS", "60"))
CONCURRENT_USERS = int(os.getenv("MATERIAL_LOAD_USERS", "6"))
MAX_P95_SECONDS = float(os.getenv("MATERIAL_LOAD_MAX_P95_SECONDS", "2.0"))


def _percentile(values, percentile):
    ordered_values = sorted(values)
    index = max(0, math.ceil(len(ordered_values) * percentile) - 1)
    return ordered_values[index]


@pytest.fixture
def load_client(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'materials_load.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    setup_session = session_factory()
    user = User(
        email="materials-load@ecomais.com",
        username="materials_load",
        cpf="39053344705",
        password_hash="test",
        full_name="Materials Load",
        is_active=True,
        is_verified=True,
    )
    setup_session.add(user)
    setup_session.add_all(
        Material(
            name=f"Load Material {index:02d}",
            category=MaterialCategory.PLASTIC,
            points_per_kg=100 + index,
            min_weight_grams=10,
            ai_class_name=f"load_material_{index:02d}",
            confidence_threshold=0.75,
        )
        for index in range(1, 21)
    )
    setup_session.commit()
    setup_session.close()

    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = lambda: user
    client = TestClient(app)
    try:
        yield client
    finally:
        client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.mark.load
def test_material_catalog_handles_concurrent_reads(load_client):
    def request_catalog(_):
        started_at = perf_counter()
        response = load_client.get("/v1/materials")
        duration = perf_counter() - started_at
        return response.status_code, response.json()["total"], duration

    test_started_at = perf_counter()
    with ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
        results = list(executor.map(request_catalog, range(REQUEST_COUNT)))
    total_duration = perf_counter() - test_started_at

    status_codes = [status_code for status_code, _, _ in results]
    totals = [total for _, total, _ in results]
    durations = [duration for _, _, duration in results]
    p95_seconds = _percentile(durations, 0.95)
    requests_per_second = REQUEST_COUNT / total_duration

    assert status_codes == [200] * REQUEST_COUNT
    assert totals == [20] * REQUEST_COUNT
    assert p95_seconds <= MAX_P95_SECONDS, (
        f"p95={p95_seconds:.3f}s exceeded {MAX_P95_SECONDS:.3f}s; "
        f"throughput={requests_per_second:.1f} req/s"
    )

