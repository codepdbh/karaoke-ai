from __future__ import annotations

from pydantic import BaseModel, Field

from backend.app.schemas.auth import UserRead


class AdminUserRead(UserRead):
    password_enabled: bool


class AdminUserCreditsUpdate(BaseModel):
    credits_remaining: int = Field(ge=0, le=100000)
