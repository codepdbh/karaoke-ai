from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.config import get_settings
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.song import SongRead
from backend.app.services.song import SongService

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/song", response_model=SongRead)
async def upload_song(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    artist: str | None = Form(default=None),
    album: str | None = Form(default=None),
    language: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SongRead:
    settings = get_settings()
    content = await file.read()
    song = SongService(db).create_from_upload(
        content=content,
        filename=file.filename or "upload.wav",
        content_type=file.content_type,
        current_user=current_user,
        title=title,
        artist=artist,
        album=album,
        language=language,
        max_size_bytes=settings.max_upload_size_bytes,
    )
    return SongRead.model_validate(song)

