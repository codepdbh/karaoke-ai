from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import require_admin
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.admin import AdminUserCreditsUpdate, AdminUserRead
from backend.app.services.admin import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserRead])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[AdminUserRead]:
    return [AdminUserRead.model_validate(user) for user in AdminService(db).list_users()]


@router.put("/users/{user_id}/credits", response_model=AdminUserRead)
def update_user_credits(
    user_id: int,
    payload: AdminUserCreditsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> AdminUserRead:
    return AdminUserRead.model_validate(
        AdminService(db).update_user_credits(user_id=user_id, credits_remaining=payload.credits_remaining)
    )
