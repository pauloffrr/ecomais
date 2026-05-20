"""
Pydantic schemas for authentication and user registration.
"""

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _normalize_digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def _is_valid_cpf(cpf_digits: str) -> bool:
    if len(cpf_digits) != 11:
        return False

    if cpf_digits == cpf_digits[0] * 11:
        return False

    def calculate_digit(numbers: str) -> str:
        total = sum(int(digit) * weight for digit, weight in zip(numbers, range(len(numbers) + 1, 1, -1)))
        remainder = (total * 10) % 11
        return "0" if remainder == 10 else str(remainder)

    first_digit = calculate_digit(cpf_digits[:9])
    second_digit = calculate_digit(cpf_digits[:9] + first_digit)
    return cpf_digits[-2:] == first_digit + second_digit


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=255)
    email: EmailStr
    cpf: str = Field(..., description="CPF com 11 dígitos, com ou sem pontuação")
    phone: str = Field(..., description="Telefone válido")
    password: str = Field(..., min_length=8, description="Senha forte com letras e números")

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized.split()) < 2:
            raise ValueError("Full name must contain at least two words")
        return normalized

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, value: str) -> str:
        cpf_digits = _normalize_digits(value)
        if len(cpf_digits) != 11:
            raise ValueError("CPF must contain exactly 11 digits")
        if not _is_valid_cpf(cpf_digits):
            raise ValueError("CPF is invalid")
        return cpf_digits

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        phone_digits = _normalize_digits(value)
        if len(phone_digits) < 10 or len(phone_digits) > 13:
            raise ValueError("Phone must contain between 10 and 13 digits")
        return phone_digits

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        has_letter = bool(re.search(r"[A-Za-z]", value))
        has_number = bool(re.search(r"\d", value))
        if not has_letter or not has_number:
            raise ValueError("Password must contain both letters and numbers")
        return value


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    cpf: str
    full_name: str
    phone: str | None = None
    total_points: int
    total_discards: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: int | None = None