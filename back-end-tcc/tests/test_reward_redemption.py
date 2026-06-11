import re

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.v1.endpoints.rewards import redeem_reward
from database import ensure_reward_balance_triggers
from models import Base, Reward, User


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    ensure_reward_balance_triggers(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


def create_user(db, points):
    user = User(
        email="reward-test@ecomais.com",
        username="reward_test",
        cpf="52998224725",
        password_hash="test",
        full_name="Reward Test",
        total_points=points,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    return user


def test_redeem_reward_persists_balance_and_ledger(db):
    user = create_user(db, 10_000)

    result = redeem_reward("monthly-transit-pass", current_user=user, db=db)

    db.refresh(user)
    transaction = db.query(Reward).filter(Reward.user_id == user.id).one()
    assert user.total_points == 8_800
    assert transaction.points == -1_200
    assert transaction.transaction_type == "redemption"
    assert result.remaining_points == 8_800
    assert re.fullmatch(r"ECO-[A-Z2-9]{4}-[A-Z2-9]{4}", result.coupon_code)


def test_redeem_reward_rejects_insufficient_points(db):
    user = create_user(db, 100)

    with pytest.raises(HTTPException) as error:
        redeem_reward("monthly-transit-pass", current_user=user, db=db)

    db.refresh(user)
    assert error.value.status_code == 400
    assert user.total_points == 100
    assert db.query(Reward).count() == 0


def test_redeem_reward_rejects_unknown_reward(db):
    user = create_user(db, 10_000)

    with pytest.raises(HTTPException) as error:
        redeem_reward("unknown-reward", current_user=user, db=db)

    assert error.value.status_code == 404


def test_reward_insert_update_and_delete_keep_balance_synchronized(db):
    user = create_user(db, 0)
    transaction = Reward(
        user_id=user.id,
        points=500,
        transaction_type="bonus",
        description="Trigger test",
    )
    db.add(transaction)
    db.commit()
    db.refresh(user)
    assert user.total_points == 500

    transaction.points = 750
    db.commit()
    db.refresh(user)
    assert user.total_points == 750

    db.delete(transaction)
    db.commit()
    db.refresh(user)
    assert user.total_points == 0


def test_reward_update_moves_points_between_users(db):
    first_user = create_user(db, 0)
    second_user = User(
        email="second-reward-test@ecomais.com",
        username="second_reward_test",
        cpf="39053344705",
        password_hash="test",
        full_name="Second Reward Test",
        total_points=0,
        is_active=True,
        is_verified=True,
    )
    db.add(second_user)
    db.commit()

    transaction = Reward(
        user_id=first_user.id,
        points=300,
        transaction_type="bonus",
    )
    db.add(transaction)
    db.commit()

    transaction.user_id = second_user.id
    db.commit()
    db.refresh(first_user)
    db.refresh(second_user)
    assert first_user.total_points == 0
    assert second_user.total_points == 300
