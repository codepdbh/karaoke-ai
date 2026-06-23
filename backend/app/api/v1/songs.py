from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.enums import SongFileType
from backend.app.models.user import User
from backend.app.schemas.common import APIMessage
from backend.app.schemas.song import SongDetail, SongRead, SongUpdate
from backend.app.services.song import SongService
from backend.app.utils.files import detect_mime_type, sanitize_text

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
    current_user: User = Depends(get_current_user),
) -> APIMessage:
    SongService(db).delete(song_id, current_user)
    return APIMessage(message="Song deleted")


@router.put("/{song_id}", response_model=SongDetail)
def update_song(
    song_id: int,
    payload: SongUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SongDetail:
    song_service = SongService(db)
    song = song_service.get_or_404(song_id)
    song_service.assert_can_manage(song, current_user)

    if payload.title is not None:
        song.title = sanitize_text(payload.title)
    if payload.artist is not None:
        song.artist = sanitize_text(payload.artist) if payload.artist else None
    if payload.album is not None:
        song.album = sanitize_text(payload.album) if payload.album else None
    if payload.language is not None:
        song.language = payload.language

    db.commit()
    db.refresh(song)
    return SongDetail.model_validate(song)



@router.get("/{song_id}/stream/original")
def stream_original(
    song_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FileResponse:
    path = SongService(db).get_stream_path(song_id, SongFileType.original)
    return FileResponse(path, media_type=detect_mime_type(path.name, "audio/mpeg"))


@router.get("/{song_id}/stream/vocals")
def stream_vocals(
    song_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FileResponse:
    path = SongService(db).get_stream_path(song_id, SongFileType.vocals)
    return FileResponse(path, media_type=detect_mime_type(path.name, "audio/mpeg"))


@router.get("/{song_id}/stream/instrumental")
def stream_instrumental(
    song_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FileResponse:
    path = SongService(db).get_stream_path(song_id, SongFileType.instrumental)
    return FileResponse(path, media_type=detect_mime_type(path.name, "audio/mpeg"))
