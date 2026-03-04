from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, hash_password, verify_password
from backend.app.models.user import User
from backend.app.repositories.user import UserRepository
from backend.app.schemas.auth import LoginRequest, RegisterRequest


class AuthService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.users = UserRepository(session)

    def register(self, payload: RegisterRequest) -> User:
        if self.users.get_by_email(payload.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        if self.users.get_by_username(payload.username):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

        user = User(
            email=payload.email,
            username=payload.username,
            password_hash=hash_password(payload.password),
        )
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def login(self, payload: LoginRequest) -> tuple[str, User]:
        user = self.users.get_by_email(payload.email)
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        token = create_access_token(str(user.id), extra_claims={"email": user.email})
        return token, user

