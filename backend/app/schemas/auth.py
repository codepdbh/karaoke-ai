from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from backend.app.models.enums import AuthProvider, UserRole
from backend.app.schemas.common import ORMModel, TokenResponse


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserAccessRequest(BaseModel):
    email: EmailStr
    first_name: str = Field(min_length=2, max_length=120)
    last_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserRead(ORMModel):
    id: int
    email: EmailStr
    first_name: str | None
    last_name: str | None
    username: str
    role: UserRole
    auth_provider: AuthProvider
    credits_remaining: int
    created_at: datetime
    updated_at: datetime


class AuthResponse(TokenResponse):
    user: UserRead
