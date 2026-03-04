from __future__ import annotations

from sqlalchemy import Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin
from backend.app.models.enums import (
    LyricsSourceProvider,
    LyricsVersionSourceType,
    LyricsVersionStatus,
)


class LyricsVersion(TimestampMixin, Base):
    __tablename__ = "lyrics_versions"
    __table_args__ = (
        Index("ix_lyrics_versions_song_status", "song_id", "status"),
        Index("ix_lyrics_versions_song_created_at", "song_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    version_name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[LyricsVersionSourceType] = mapped_column(
        Enum(LyricsVersionSourceType, name="lyrics_version_source_type"), nullable=False
    )
    source_provider: Mapped[LyricsSourceProvider] = mapped_column(
        Enum(LyricsSourceProvider, name="lyrics_source_provider"),
        default=LyricsSourceProvider.none,
        nullable=False,
    )
    status: Mapped[LyricsVersionStatus] = mapped_column(
        Enum(LyricsVersionStatus, name="lyrics_version_status"),
        default=LyricsVersionStatus.draft,
        nullable=False,
    )
    language: Mapped[str | None] = mapped_column(String(12))
    confidence_score: Mapped[float | None] = mapped_column()
    is_locked: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    song = relationship("Song", back_populates="lyrics_versions")
    creator = relationship("User", back_populates="lyrics_versions")
    lines = relationship("LyricsLine", back_populates="version", cascade="all, delete-orphan")


class LyricsLine(Base):
    __tablename__ = "lyrics_lines"
    __table_args__ = (
        Index("ix_lyrics_lines_version_line", "lyrics_version_id", "line_index"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    lyrics_version_id: Mapped[int] = mapped_column(
        ForeignKey("lyrics_versions.id", ondelete="CASCADE"), nullable=False
    )
    line_index: Mapped[int] = mapped_column(nullable=False)
    text: Mapped[str] = mapped_column(String(2000), nullable=False)
    start_time: Mapped[float | None] = mapped_column()
    end_time: Mapped[float | None] = mapped_column()
    confidence_score: Mapped[float | None] = mapped_column()

    version = relationship("LyricsVersion", back_populates="lines")
    words = relationship("WordTiming", back_populates="line", cascade="all, delete-orphan")


class WordTiming(Base):
    __tablename__ = "word_timings"
    __table_args__ = (
        Index("ix_word_timings_line_word", "lyrics_line_id", "word_index"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    lyrics_line_id: Mapped[int] = mapped_column(
        ForeignKey("lyrics_lines.id", ondelete="CASCADE"), nullable=False
    )
    word_index: Mapped[int] = mapped_column(nullable=False)
    word: Mapped[str] = mapped_column(String(255), nullable=False)
    start_time: Mapped[float | None] = mapped_column()
    end_time: Mapped[float | None] = mapped_column()
    confidence_score: Mapped[float | None] = mapped_column()

    line = relationship("LyricsLine", back_populates="words")
