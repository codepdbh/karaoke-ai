from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.lyrics import (
    LyricsPayloadRead,
    LyricsVersionCreate,
    LyricsVersionRead,
    LyricsVersionUpdate,
)
from backend.app.services.lyrics import LyricsService

router = APIRouter(tags=["lyrics"])


@router.get("/songs/{song_id}/lyrics", response_model=LyricsPayloadRead)
def get_song_lyrics(
    song_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> LyricsPayloadRead:
    return LyricsService(db).get_song_payload(song_id)


@router.get("/songs/{song_id}/lyrics/versions", response_model=list[LyricsVersionRead])
def list_lyrics_versions(
    song_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[LyricsVersionRead]:
    return [LyricsVersionRead.model_validate(item) for item in LyricsService(db).list_versions(song_id)]


@router.get("/lyrics/versions/{version_id}", response_model=LyricsVersionRead)
def get_lyrics_version(
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> LyricsVersionRead:
    version = LyricsService(db).get_version_or_404(version_id)
    return LyricsVersionRead.model_validate(version)


@router.post("/songs/{song_id}/lyrics/versions", response_model=LyricsVersionRead)
def create_lyrics_version(
    song_id: int,
    payload: LyricsVersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LyricsVersionRead:
    version = LyricsService(db).create_version(song_id, payload, current_user.id)
    return LyricsVersionRead.model_validate(version)


@router.put("/lyrics/versions/{version_id}", response_model=LyricsVersionRead)
def update_lyrics_version(
    version_id: int,
    payload: LyricsVersionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> LyricsVersionRead:
    version = LyricsService(db).update_version(version_id, payload)
    return LyricsVersionRead.model_validate(version)


@router.post("/lyrics/versions/{version_id}/publish", response_model=LyricsVersionRead)
def publish_lyrics_version(
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> LyricsVersionRead:
    version = LyricsService(db).publish(version_id)
    return LyricsVersionRead.model_validate(version)
