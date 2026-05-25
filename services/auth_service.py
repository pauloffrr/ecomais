"""
Authentication service.
Handles password verification and JWT access token creation.
"""

from datetime import datetime, timedelta, timezone
import re
from typing import Any

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import get_settings
from models import User

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt."""
    return pwd_context.hash(password)


def generate_username(email: str, db: Session) -> str:
    """Generate a unique username from an email address."""
    base_username = email.split("@", 1)[0].lower()
    base_username = re.sub(r"[^a-z0-9_]+", "_", base_username)
    base_username = re.sub(r"_+", "_", base_username).strip("_") or "user"

    candidate = base_username
    suffix = 1

    while db.query(User.id).filter(User.username == candidate).first() is not None:
        candidate = f"{base_username}{suffix}"
        suffix += 1

    return candidate


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token with an expiration time."""
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta is not None else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
