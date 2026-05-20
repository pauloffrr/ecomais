"""
User CRUD endpoints.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.dependencies import get_current_active_user
from api.v1.schemas.auth import UserResponse
from api.v1.schemas.users import UserListResponse, UserUpdate
from database import get_db
from models import User
from services.auth_service import hash_password

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=UserListResponse)
def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    total = db.query(User).count()
    users = db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return UserListResponse(users=[UserResponse.model_validate(user) for user in users], total=total)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to modify this user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.email is not None:
        email = payload.email.lower()
        existing_email = db.query(User).filter(User.email == email, User.id != user_id).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="A user with this email already exists")
        user.email = email

    if payload.cpf is not None:
        existing_cpf = db.query(User).filter(User.cpf == payload.cpf, User.id != user_id).first()
        if existing_cpf:
            raise HTTPException(status_code=400, detail="A user with this CPF already exists")
        user.cpf = payload.cpf

    if payload.full_name is not None:
        user.full_name = payload.full_name

    if payload.phone is not None:
        user.phone = payload.phone

    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    if payload.is_active is not None:
        user.is_active = payload.is_active

    if payload.is_verified is not None:
        user.is_verified = payload.is_verified

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        logger.warning("User update failed due to a unique constraint violation")
        raise HTTPException(status_code=400, detail="Unable to update user because a unique field already exists")

    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Soft delete: desativa o usuário preservando o histórico de pontos e reciclagens
    user.is_active = False
    user.email = f"deleted_{user.id}_{user.email}" # Opcional: Libera o email para um novo cadastro futuro
    db.commit()
    return None
