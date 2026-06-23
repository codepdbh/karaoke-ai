from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, hash_password, verify_password
from backend.app.models.enums import AuthProvider, UserRole
from backend.app.models.user import User
from backend.app.repositories.user import UserRepository
from backend.app.schemas.auth import AdminLoginRequest, UserAccessRequest, UserLoginRequest


class AuthService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.users = UserRepository(session)

    def login_admin(self, payload: AdminLoginRequest) -> tuple[str, User]:
        return self.login_user(UserLoginRequest(email=payload.email, password=payload.password), "")

    def register_user(self, payload: UserAccessRequest, client_ip: str) -> tuple[str, User]:
        email = payload.email.strip().lower()
        first_name = payload.first_name.strip()
        last_name = payload.last_name.strip()
        password = payload.password

        user = self.users.get_by_email(email)

        if user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Esta cuenta ya existe. Usa la opcion de iniciar sesion",
            )

        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            username=self._build_unique_username(f"{first_name}-{last_name}"),
            password_hash=hash_password(password),
            auth_provider=AuthProvider.local,
            google_sub=None,
            bound_ip=client_ip,
            credits_remaining=2,
            role=UserRole.listener,
        )
        self.session.add(user)

        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se pudo crear la cuenta",
            ) from exc
        self.session.refresh(user)
        token = create_access_token(str(user.id), extra_claims={"email": user.email})
        return token, user

    def login_user(self, payload: UserLoginRequest, client_ip: str) -> tuple[str, User]:
        email = payload.email.strip().lower()
        password = payload.password
        user = self.users.get_by_email(email)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Cuenta no encontrada")
        if user.auth_provider != AuthProvider.local:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usa el metodo de acceso original")
        if not user.password_hash or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")
        token = create_access_token(str(user.id), extra_claims={"email": user.email})
        return token, user

    def _build_unique_username(self, raw_value: str) -> str:
        base = "".join(ch.lower() if ch.isalnum() else "-" for ch in raw_value).strip("-") or "usuario"
        base = base[:48]
        candidate = base
        suffix = 1
        while self.users.get_by_username(candidate):
            suffix += 1
            candidate = f"{base[:55-len(str(suffix))]}{suffix}"
        return candidate
