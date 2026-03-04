from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.enums import SongFileType
from backend.app.models.song import Song, SongFile


class SongRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, query: str | None = None) -> list[Song]:
        statement = select(Song).options(selectinload(Song.files)).order_by(Song.created_at.desc())
        if query:
            pattern = f"%{query}%"
            statement = statement.where(or_(Song.title.ilike(pattern), Song.artist.ilike(pattern)))
        return list(self.session.scalars(statement).unique())

    def get(self, song_id: int) -> Song | None:
        statement = (
            select(Song)
            .options(selectinload(Song.files), selectinload(Song.lyrics_versions))
            .where(Song.id == song_id)
        )
        return self.session.scalar(statement)

    def get_file(self, song_id: int, file_type: SongFileType) -> SongFile | None:
        statement = select(SongFile).where(
            SongFile.song_id == song_id, SongFile.file_type == file_type
        )
        return self.session.scalar(statement)

