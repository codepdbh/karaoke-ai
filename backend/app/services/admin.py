from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.user import User
from backend.app.repositories.user import UserRepository


class AdminService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.users = UserRepository(session)

    def list_users(self) -> list[User]:
        return self.users.list()

    def update_user_credits(self, *, user_id: int, credits_remaining: int) -> User:
        user = self.users.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        user.credits_remaining = credits_remaining
        self.session.commit()
        self.session.refresh(user)
        return user
