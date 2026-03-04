from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.enums import SongFileType
from backend.app.models.user import User
from backend.app.schemas.common import APIMessage
from backend.app.schemas.song import SongDetail, SongRead
from backend.app.services.song import SongService

router = APIRouter(prefix="/songs", tags=["songs"])


@router.get("", response_model=list[SongRead])
def list_songs(
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[SongRead]:
    songs = SongService(db).list(q)
    return [SongRead.model_validate(song) for song in songs]


@router.get("/{song_id}", response_model=SongDetail)
def get_song(
    song_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SongDetail:
    song = SongService(db).get_or_404(song_id)
    return SongDetail.model_validate(song)


@router.delete("/{song_id}", response_model=APIMessage)
def delete_song(
    song_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> APIMessage:
    SongService(db).delete(song_id)
    return APIMessage(message="Song deleted")


@router.get("/{song_id}/stream/original")
def stream_original(
    song_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FileResponse:
    return FileResponse(SongService(db).get_stream_path(song_id, SongFileType.original))


@router.get("/{song_id}/stream/vocals")
def stream_vocals(
    song_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FileResponse:
    return FileResponse(SongService(db).get_stream_path(song_id, SongFileType.vocals))


@router.get("/{song_id}/stream/instrumental")
def stream_instrumental(
    song_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FileResponse:
    return FileResponse(SongService(db).get_stream_path(song_id, SongFileType.instrumental))

