from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.enums import LyricsVersionStatus
from backend.app.models.lyrics import LyricsLine, LyricsVersion


class LyricsRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def _with_lines(self):
        return selectinload(LyricsVersion.lines).selectinload(LyricsLine.words)

    def get_version(self, version_id: int) -> LyricsVersion | None:
        statement = select(LyricsVersion).options(self._with_lines()).where(LyricsVersion.id == version_id)
        return self.session.scalar(statement)

    def list_song_versions(self, song_id: int) -> list[LyricsVersion]:
        statement = (
            select(LyricsVersion)
            .options(self._with_lines())
            .where(LyricsVersion.song_id == song_id)
            .order_by(LyricsVersion.created_at.desc())
        )
        return list(self.session.scalars(statement).unique())

    def get_preferred_version(self, song_id: int) -> LyricsVersion | None:
        statement = (
            select(LyricsVersion)
            .options(self._with_lines())
            .where(
                LyricsVersion.song_id == song_id,
                LyricsVersion.status == LyricsVersionStatus.published,
            )
            .order_by(LyricsVersion.updated_at.desc())
        )
        published = self.session.scalar(statement)
        if published:
            return published
        versions = self.list_song_versions(song_id)
        return versions[0] if versions else None

