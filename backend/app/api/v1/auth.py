from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import (
    AdminLoginRequest,
    AuthResponse,
    UserAccessRequest,
    UserLoginRequest,
    UserRead,
)
from backend.app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded_for.split(",", 1)[0].strip() or (request.client.host if request.client else "")
    if not client_ip:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo determinar la IP")
    return client_ip


@router.post("/register", response_model=AuthResponse)
def register_user(
    payload: UserAccessRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthResponse:
    token, user = AuthService(db).register_user(payload, _get_client_ip(request))
    return AuthResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login_user(
    payload: UserLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthResponse:
    token, user = AuthService(db).login_user(payload, _get_client_ip(request))
    return AuthResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/admin/login", response_model=AuthResponse)
def login_admin(payload: AdminLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    token, user = AuthService(db).login_admin(payload)
    return AuthResponse(access_token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)
