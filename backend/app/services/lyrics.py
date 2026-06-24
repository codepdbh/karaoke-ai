from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.models.enums import LyricsVersionStatus, UserRole
from backend.app.models.lyrics import LyricsLine, LyricsVersion, WordTiming
from backend.app.models.song import Song
from backend.app.models.user import User
from backend.app.repositories.lyrics import LyricsRepository
from backend.app.schemas.lyrics import (
    LyricsLinePayload,
    LyricsPayloadRead,
    LyricsVersionCreate,
    LyricsVersionUpdate,
    WordTimingPayload,
)


class LyricsService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.lyrics = LyricsRepository(session)

    def _hydrate_lines(self, version: LyricsVersion, lines: list[LyricsLinePayload]) -> None:
        version.lines.clear()
        for line in sorted(lines, key=lambda item: item.line_index):
            line_model = LyricsLine(
                line_index=line.line_index,
                text=line.text,
                start_time=line.start,
                end_time=line.end,
                confidence_score=line.confidence,
            )
            for word in sorted(line.words, key=lambda item: item.word_index):
                line_model.words.append(
                    WordTiming(
                        word_index=word.word_index,
                        word=word.text,
                        start_time=word.start,
                        end_time=word.end,
                        confidence_score=word.confidence,
                    )
                )
            version.lines.append(line_model)

    def _build_payload(self, version: LyricsVersion) -> LyricsPayloadRead:
        lines = [
            LyricsLinePayload(
                line_index=line.line_index,
                text=line.text,
                start=line.start_time or 0.0,
                end=line.end_time or 0.0,
                confidence=line.confidence_score,
                words=[
                    WordTimingPayload(
                        word_index=word.word_index,
                        text=word.word,
                        start=word.start_time or 0.0,
                        end=word.end_time or 0.0,
                        confidence=word.confidence_score,
                    )
                    for word in sorted(line.words, key=lambda item: item.word_index)
                ],
            )
            for line in sorted(version.lines, key=lambda item: item.line_index)
        ]
        return LyricsPayloadRead(
            song_id=version.song_id,
            language=version.language,
            version_id=version.id,
            lines=lines,
        )

    def _assert_can_manage_song(self, song_id: int, current_user: User) -> None:
        if current_user.role == UserRole.admin:
            return
        owner_id = self.session.scalar(select(Song.created_by).where(Song.id == song_id))
        if owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para modificar las letras de esta cancion",
            )

    def get_song_payload(self, song_id: int) -> LyricsPayloadRead:
        version = self.lyrics.get_preferred_version(song_id)
        if not version:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lyrics not found")
        return self._build_payload(version)

    def list_versions(self, song_id: int) -> list[LyricsVersion]:
        return self.lyrics.list_song_versions(song_id)

    def get_version_or_404(self, version_id: int) -> LyricsVersion:
        version = self.lyrics.get_version(version_id)
        if not version:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lyrics version not found")
        return version

    def create_version(self, song_id: int, payload: LyricsVersionCreate, current_user: User) -> LyricsVersion:
        self._assert_can_manage_song(song_id, current_user)
        version = LyricsVersion(
            song_id=song_id,
            version_name=payload.version_name,
            source_type=payload.source_type,
            source_provider=payload.source_provider,
            status=payload.status,
            language=payload.language,
            confidence_score=payload.confidence_score,
            is_locked=payload.is_locked,
            created_by=current_user.id,
        )
        self._hydrate_lines(version, payload.lines)
        self.session.add(version)
        self.session.commit()
        self.session.refresh(version)
        return self.lyrics.get_version(version.id) or version

    def update_version(self, version_id: int, payload: LyricsVersionUpdate, current_user: User) -> LyricsVersion:
        version = self.lyrics.get_version(version_id)
        if not version:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lyrics version not found")
        self._assert_can_manage_song(version.song_id, current_user)
        if version.is_locked:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Lyrics version is locked")

        if payload.version_name is not None:
            version.version_name = payload.version_name
        if payload.status is not None:
            version.status = payload.status
        if payload.language is not None:
            version.language = payload.language
        if payload.confidence_score is not None:
            version.confidence_score = payload.confidence_score
        if payload.is_locked is not None:
            version.is_locked = payload.is_locked
        if payload.lines is not None:
            self._hydrate_lines(version, payload.lines)

        self.session.commit()
        self.session.refresh(version)
        return self.lyrics.get_version(version.id) or version

    def publish(self, version_id: int, current_user: User) -> LyricsVersion:
        version = self.lyrics.get_version(version_id)
        if not version:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lyrics version not found")
        self._assert_can_manage_song(version.song_id, current_user)
        self.session.execute(
            update(LyricsVersion)
            .where(
                LyricsVersion.song_id == version.song_id,
                LyricsVersion.status == LyricsVersionStatus.published,
                LyricsVersion.id != version_id,
            )
            .values(status=LyricsVersionStatus.deprecated)
        )
        version.status = LyricsVersionStatus.published
        self.session.commit()
        self.session.refresh(version)
        return self.lyrics.get_version(version.id) or version
