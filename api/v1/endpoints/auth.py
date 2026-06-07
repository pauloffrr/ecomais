"""
Authentication endpoints.
"""

import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from sqlalchemy.orm import Session

from api.v1.schemas.auth import PasswordResetRequest, Token, UserCreate, UserResponse
from database import get_db
from models import User
from services.auth_service import create_access_token, generate_username, hash_password, verify_password
from config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


def _authenticate_user(db: Session, login_identifier: str, password: str) -> User | None:
    normalized_login = login_identifier.strip().lower()
    user = db.query(User).filter(
        or_(User.email == normalized_login, User.username == normalized_login)
    ).first()

    if not user or not verify_password(password, user.password_hash):
        return None

    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user with this email already exists")

    existing_cpf = db.query(User).filter(User.cpf == payload.cpf).first()
    if existing_cpf:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user with this CPF already exists")

    username = generate_username(email, db)
    password_hash = hash_password(payload.password)

    user = User(
        email=email,
        username=username,
        cpf=payload.cpf,
        full_name=payload.full_name,
        phone=payload.phone,
        password_hash=password_hash,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        logger.warning("Registration failed due to a unique constraint violation")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to register user because the email, CPF, or username already exists",
        )

    return UserResponse.model_validate(user)


@router.post("/login", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = _authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires,
    )

    return Token(access_token=access_token, token_type="bearer")


@router.post("/reset-password")
def reset_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email, User.cpf == payload.cpf).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with the provided email and CPF",
        )

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    return {"message": "Password updated successfully"}
