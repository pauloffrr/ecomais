from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest

from models import ActiveSession, Material, SessionStatus, User, Discard, Reward
from services import background_tasks
from services import validation_service as vs


def _db_query_mock(return_map):
    db = MagicMock()

    def query_side_effect(model):
        query = MagicMock()
        query.filter.return_value.first.return_value = return_map.get(model)
        query.filter.return_value.count.return_value = return_map.get((model, "count"), 0)
        query.count.return_value = return_map.get((model, "count"), 0)
        return query

    db.query.side_effect = query_side_effect
    db.commit = MagicMock()
    db.rollback = MagicMock()
    db.add = MagicMock()
    return db


def test_validate_weight_success():
    db = MagicMock()

    is_valid, message = vs.validate_weight(500.0, user_id=1, db=db)

    assert is_valid is True
    assert message == ""


def test_validate_weight_below_minimum():
    db = MagicMock()

    is_valid, message = vs.validate_weight(5.0, user_id=1, db=db)

    assert is_valid is False
    assert "below minimum" in message


def test_validate_session_success():
    session = ActiveSession(
        id=10,
        user_id=1,
        bin_id=2,
        session_token="token-123",
        status=SessionStatus.ACTIVE,
        expires_at=datetime.utcnow() + timedelta(minutes=3),
    )
    db = _db_query_mock({ActiveSession: session})

    is_valid, returned_session, message = vs.validate_session("token-123", 2, db)

    assert is_valid is True
    assert returned_session is session
    assert message == ""
    db.commit.assert_not_called()


def test_validate_session_expired_marks_session_expired():
    session = ActiveSession(
        id=11,
        user_id=1,
        bin_id=2,
        session_token="token-expired",
        status=SessionStatus.ACTIVE,
        expires_at=datetime.utcnow() - timedelta(minutes=1),
    )
    db = _db_query_mock({ActiveSession: session})

    is_valid, returned_session, message = vs.validate_session("token-expired", 2, db)

    assert is_valid is False
    assert returned_session is session
    assert session.status == SessionStatus.EXPIRED
    assert "expired" in message.lower()
    db.commit.assert_called_once()


def test_process_image_with_ai_low_confidence_flags_validation_error(monkeypatch):
    discard = Discard(
        id=100,
        user_id=1,
        weight_grams=1000.0,
        session_validated=True,
        weight_validated=True,
        vision_validated=False,
        is_validated=False,
        points_awarded=0,
        points_applied=False,
        flagged_as_suspicious=False,
        admin_reviewed=False,
    )
    material = Material(
        id=20,
        name="PET Plastic Bottle",
        ai_class_name="plastic_pet",
        points_per_kg=120.0,
        confidence_threshold=0.90,
    )
    db = MagicMock()

    discard_query = MagicMock()
    discard_query.filter.return_value.first.return_value = discard
    material_query = MagicMock()
    material_query.filter.return_value.first.return_value = material
    user_query = MagicMock()
    user_query.filter.return_value.first.return_value = None

    def query_side_effect(model):
        if model is Discard:
            return discard_query
        if model is Material:
            return material_query
        if model is User:
            return user_query
        raise AssertionError(f"Unexpected model: {model}")

    db.query.side_effect = query_side_effect
    db.commit = MagicMock()
    db.rollback = MagicMock()

    monkeypatch.setattr(background_tasks, "run_ai_classification", lambda _: {"class_name": "plastic_pet", "confidence": 0.4})

    background_tasks.process_image_with_ai(discard_id=100, image_path="/tmp/image.jpg", db=db)

    assert discard.vision_validated is False
    assert discard.validation_errors == "AI confidence too low: 0.4"
    db.commit.assert_called()


def test_process_image_with_ai_success_awards_points(monkeypatch):
    discard = Discard(
        id=101,
        user_id=1,
        weight_grams=1000.0,
        session_validated=True,
        weight_validated=True,
        vision_validated=False,
        is_validated=False,
        points_awarded=0,
        points_applied=False,
        flagged_as_suspicious=False,
        admin_reviewed=False,
    )
    material = Material(
        id=21,
        name="PET Plastic Bottle",
        ai_class_name="plastic_pet",
        points_per_kg=120.0,
        confidence_threshold=0.70,
    )
    user = User(
        id=1,
        email="user@example.com",
        username="user1",
        cpf="39053344705",
        password_hash="hashed",
        full_name="User Example",
        total_points=0,
        total_discards=0,
        is_active=True,
        is_verified=True,
    )

    db = MagicMock()
    discard_query = MagicMock()
    discard_query.filter.return_value.first.return_value = discard
    material_query = MagicMock()
    material_query.filter.return_value.first.return_value = material
    user_query = MagicMock()
    user_query.filter.return_value.first.return_value = user

    def query_side_effect(model):
        if model is Discard:
            return discard_query
        if model is Material:
            return material_query
        if model is User:
            return user_query
        raise AssertionError(f"Unexpected model: {model}")

    db.query.side_effect = query_side_effect
    db.commit = MagicMock()
    db.rollback = MagicMock()
    db.add = MagicMock()

    monkeypatch.setattr(background_tasks, "run_ai_classification", lambda _: {"class_name": "plastic_pet", "confidence": 0.95})

    background_tasks.process_image_with_ai(discard_id=101, image_path="/tmp/image.jpg", db=db)

    assert discard.vision_validated is True
    assert discard.is_validated is True
    assert discard.points_awarded == 120
    assert discard.points_applied is True
    assert user.total_points == 120
    assert user.total_discards == 1
    assert db.add.called
    assert any(isinstance(call.args[0], Reward) for call in db.add.call_args_list)


def test_ai_classification_executes_with_lock_and_logs(monkeypatch, caplog):
    execution_state = {"locked": False, "model_called": False}

    class TrackingLock:
        def __enter__(self):
            execution_state["locked"] = True

        def __exit__(self, exc_type, exc_value, traceback):
            execution_state["locked"] = False

    class Probabilities:
        top1 = 0
        top1conf = 0.93

    class Result:
        probs = Probabilities()

    class Model:
        names = {0: "plastic_pet"}

        def __call__(self, image_path, verbose):
            assert execution_state["locked"] is True
            assert image_path == "discard.jpg"
            assert verbose is False
            execution_state["model_called"] = True
            return [Result()]

    monkeypatch.setattr(background_tasks, "ai_inference_lock", TrackingLock())
    monkeypatch.setattr(background_tasks, "yolo_model", Model())

    with caplog.at_level("INFO", logger=background_tasks.__name__):
        result = background_tasks.run_ai_classification("discard.jpg")

    assert execution_state == {"locked": False, "model_called": True}
    assert result == {"class_name": "plastic_pet", "confidence": 0.93}
    assert "AI inference lock acquired" in caplog.text
    assert "AI inference completed" in caplog.text
    assert "AI inference lock released" in caplog.text
