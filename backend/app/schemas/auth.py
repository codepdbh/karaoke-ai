from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from backend.app.models.enums import UserRole
from backend.app.schemas.common import ORMModel, TokenResponse


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserRead(ORMModel):
    id: int
    email: EmailStr
    username: str
    role: UserRole
    created_at: datetime
    updated_at: datetime


class AuthResponse(TokenResponse):
    user: UserRead

