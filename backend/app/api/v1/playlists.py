from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.common import APIMessage
from backend.app.schemas.playlist import PlaylistCreate, PlaylistRead, PlaylistUpdate
from backend.app.services.playlist import PlaylistService

router = APIRouter(prefix="/playlists", tags=["playlists"])


@router.get("", response_model=list[PlaylistRead])
def list_playlists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PlaylistRead]:
    return [PlaylistRead.model_validate(item) for item in PlaylistService(db).list(current_user)]


@router.post("", response_model=PlaylistRead)
def create_playlist(
    payload: PlaylistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlaylistRead:
    playlist = PlaylistService(db).create(
        current_user=current_user,
        name=payload.name,
        description=payload.description,
        song_ids=payload.song_ids,
    )
    return PlaylistRead.model_validate(playlist)


@router.get("/{playlist_id}", response_model=PlaylistRead)
def get_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlaylistRead:
    return PlaylistRead.model_validate(PlaylistService(db).get_or_404(playlist_id, current_user))


@router.put("/{playlist_id}", response_model=PlaylistRead)
def update_playlist(
    playlist_id: int,
    payload: PlaylistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlaylistRead:
    playlist = PlaylistService(db).update(
        playlist_id=playlist_id,
        current_user=current_user,
        name=payload.name,
        description=payload.description,
        song_ids=payload.song_ids,
    )
    return PlaylistRead.model_validate(playlist)


@router.delete("/{playlist_id}", response_model=APIMessage)
def delete_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> APIMessage:
    PlaylistService(db).delete(playlist_id, current_user)
    return APIMessage(message="Playlist deleted")

