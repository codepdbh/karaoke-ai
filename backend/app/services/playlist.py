from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.playlist import Playlist, PlaylistSong
from backend.app.models.user import User
from backend.app.repositories.playlist import PlaylistRepository


class PlaylistService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.playlists = PlaylistRepository(session)

    def list(self, current_user: User) -> list[Playlist]:
        return self.playlists.list_by_user(current_user.id)

    def get_or_404(self, playlist_id: int, current_user: User) -> Playlist:
        playlist = self.playlists.get_by_id(playlist_id)
        if not playlist or playlist.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
        return playlist

    def create(self, *, current_user: User, name: str, description: str | None, song_ids: list[int]) -> Playlist:
        playlist = Playlist(user_id=current_user.id, name=name, description=description)
        for index, song_id in enumerate(song_ids):
            playlist.songs.append(PlaylistSong(song_id=song_id, sort_order=index))
        self.session.add(playlist)
        self.session.commit()
        self.session.refresh(playlist)
        return self.get_or_404(playlist.id, current_user)

    def update(
        self,
        *,
        playlist_id: int,
        current_user: User,
        name: str | None,
        description: str | None,
        song_ids: list[int] | None,
    ) -> Playlist:
        playlist = self.get_or_404(playlist_id, current_user)
        if name is not None:
            playlist.name = name
        if description is not None:
            playlist.description = description
        if song_ids is not None:
            playlist.songs.clear()
            for index, song_id in enumerate(song_ids):
                playlist.songs.append(PlaylistSong(song_id=song_id, sort_order=index))
        self.session.commit()
        self.session.refresh(playlist)
        return self.get_or_404(playlist.id, current_user)

    def delete(self, playlist_id: int, current_user: User) -> None:
        playlist = self.get_or_404(playlist_id, current_user)
        self.session.delete(playlist)
        self.session.commit()

