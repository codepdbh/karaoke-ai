from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.playlist import Playlist


class PlaylistRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_by_user(self, user_id: int) -> list[Playlist]:
        statement = (
            select(Playlist)
            .options(selectinload(Playlist.songs))
            .where(Playlist.user_id == user_id)
            .order_by(Playlist.updated_at.desc())
        )
        return list(self.session.scalars(statement).unique())

    def get_by_id(self, playlist_id: int) -> Playlist | None:
        statement = (
            select(Playlist)
            .options(selectinload(Playlist.songs))
            .where(Playlist.id == playlist_id)
        )
        return self.session.scalar(statement)

