"""
User CRUD endpoints.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.dependencies import get_current_active_user, get_current_admin_user
from api.v1.schemas.auth import UserResponse
from api.v1.schemas.users import PasswordChangeRequest, UserAdminCreate, UserListResponse, UserUpdate
from database import get_db
from models import AuditLog, User
from services.auth_service import generate_username, hash_password, verify_password

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=UserListResponse)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    total = db.query(User).count()
    users = db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return UserListResponse(users=[UserResponse.model_validate(user) for user in users], total=total)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserAdminCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    email = payload.email.lower()

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user with this email already exists")

    existing_cpf = db.query(User).filter(User.cpf == payload.cpf).first()
    if existing_cpf:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user with this CPF already exists")

    user = User(
        email=email,
        username=generate_username(email, db),
        cpf=payload.cpf,
        full_name=payload.full_name,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        is_active=payload.is_active,
        is_verified=payload.is_verified,
        is_admin=payload.is_admin,
    )

    try:
        db.add(user)
        db.flush()
        audit_log = AuditLog(
            event_type="user_created",
            entity_type="user",
            entity_id=user.id,
            details=json.dumps({"action_by_user_id": current_user.id, "action_by_email": current_user.email}),
        )
        db.add(audit_log)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        logger.warning("User creation failed due to a unique constraint violation")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create user because the email, CPF, or username already exists",
        )

    return UserResponse.model_validate(user)


@router.put("/me/password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )

    current_user.password_hash = hash_password(payload.new_password)
    audit_log = AuditLog(
        event_type="user_password_changed",
        entity_type="user",
        entity_id=current_user.id,
        details=json.dumps({"action_by_user_id": current_user.id, "action_by_email": current_user.email}),
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Password updated successfully"}


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to modify this user")

    protected_fields = (payload.is_active, payload.is_verified, payload.is_admin)
    if not current_user.is_admin and any(value is not None for value in protected_fields):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can change account status or privileges",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.email is not None:
        email = payload.email.lower()
        existing_email = db.query(User).filter(User.email == email, User.id != user_id).first()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user with this email already exists")
        user.email = email

    if payload.cpf is not None:
        existing_cpf = db.query(User).filter(User.cpf == payload.cpf, User.id != user_id).first()
        if existing_cpf:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user with this CPF already exists")
        user.cpf = payload.cpf

    if payload.full_name is not None:
        user.full_name = payload.full_name

    if payload.phone is not None:
        user.phone = payload.phone

    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    if payload.is_active is not None and current_user.is_admin:
        user.is_active = payload.is_active

    if payload.is_verified is not None and current_user.is_admin:
        user.is_verified = payload.is_verified

    if payload.is_admin is not None and current_user.is_admin:
        user.is_admin = payload.is_admin

    try:
        db.flush()
        audit_log = AuditLog(
            event_type="user_updated",
            entity_type="user",
            entity_id=user.id,
            details=json.dumps({"action_by_user_id": current_user.id, "action_by_email": current_user.email}),
        )
        db.add(audit_log)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        logger.warning("User update failed due to a unique constraint violation")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to update user because a unique field already exists",
        )

    return UserResponse.model_validate(user)


@router.put("/me/password")
def change_current_user_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )

    current_user.password_hash = hash_password(payload.new_password)

    audit_log = AuditLog(
        event_type="user_password_changed",
        entity_type="user",
        entity_id=current_user.id,
        details=json.dumps({"action_by_user_id": current_user.id, "action_by_email": current_user.email}),
    )
    db.add(audit_log)
    db.commit()
    db.refresh(current_user)

    return {"message": "Password updated successfully"}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this user")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Soft delete: desativa o usuario preservando o historico de pontos e reciclagens.
    user.is_active = False
    user.email = f"deleted_{user.id}_{user.email}"

    audit_log = AuditLog(
        event_type="user_deleted",
        entity_type="user",
        entity_id=user.id,
        details=json.dumps({"action_by_user_id": current_user.id, "action_by_email": current_user.email}),
    )
    db.add(audit_log)
    db.commit()
    return None
