from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.config import get_settings
from backend.app.db.session import get_db
from backend.app.models.enums import SongSourceType
from backend.app.models.user import User
from backend.app.schemas.music_import import MusicImportRequest, MusicSearchResult
from backend.app.schemas.song import SongRead
from backend.app.services.music_import import _is_spotiflac_url, download_authorized_audio, search_open_audio
from backend.app.services.song import SongService

router = APIRouter(prefix="/music", tags=["music"])


@router.get("/search", response_model=list[MusicSearchResult])
def search_music(
    q: str = Query(..., min_length=2, max_length=120),
    limit: int = Query(default=8, ge=1, le=12),
    _: User = Depends(get_current_user),
) -> list[MusicSearchResult]:
    settings = get_settings()
    return search_open_audio(q, max_size_bytes=settings.max_upload_size_bytes, limit=limit)


@router.post("/import-url", response_model=SongRead)
def import_music_url(
    payload: MusicImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SongRead:
    if not payload.rights_confirmed:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirma que tienes derecho a usar ese audio.",
        )

    settings = get_settings()
    audio = download_authorized_audio(payload.url, max_size_bytes=settings.max_upload_size_bytes)
    if _is_spotiflac_url(payload.url) and (not payload.title or not payload.artist):
        from pathlib import Path

        stem = Path(audio.filename).stem
        if " - " in stem:
            artist, title = stem.split(" - ", 1)
            if not payload.artist:
                payload.artist = artist.strip()
            if not payload.title:
                payload.title = title.strip()

    song = SongService(db).create_from_upload(
        content=audio.content,
        filename=audio.filename,
        content_type=audio.content_type,
        current_user=current_user,
        title=payload.title,
        artist=payload.artist,
        album=payload.album,
        language=payload.language,
        max_size_bytes=settings.max_upload_size_bytes,
        source_type=SongSourceType.import_,
    )
    return SongRead.model_validate(song)
