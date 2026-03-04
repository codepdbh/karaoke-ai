from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin
from backend.app.models.enums import SongFileType, SongSourceType, SongStatus


class Song(TimestampMixin, Base):
    __tablename__ = "songs"
    __table_args__ = (
        Index("ix_songs_title_artist", "title", "artist"),
        Index("ix_songs_status_created_at", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    artist: Mapped[str | None] = mapped_column(String(255))
    album: Mapped[str | None] = mapped_column(String(255))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    language: Mapped[str | None] = mapped_column(String(12))
    status: Mapped[SongStatus] = mapped_column(
        Enum(SongStatus, name="song_status"),
        default=SongStatus.uploaded,
        index=True,
        nullable=False,
    )
    source_type: Mapped[SongSourceType] = mapped_column(
        Enum(SongSourceType, name="song_source_type"),
        default=SongSourceType.upload,
        nullable=False,
    )
    audio_fingerprint: Mapped[str | None] = mapped_column(String(128), index=True)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    creator = relationship("User", back_populates="songs")
    files = relationship("SongFile", back_populates="song", cascade="all, delete-orphan")
    lyrics_versions = relationship(
        "LyricsVersion", back_populates="song", cascade="all, delete-orphan"
    )
    jobs = relationship("Job", back_populates="song", cascade="all, delete-orphan")
    playlist_links = relationship(
        "PlaylistSong", back_populates="song", cascade="all, delete-orphan"
    )


class SongFile(Base):
    __tablename__ = "song_files"
    __table_args__ = (
        UniqueConstraint("song_id", "file_type", name="uq_song_files_song_id_file_type"),
        Index("ix_song_files_song_id_file_type", "song_id", "file_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    file_type: Mapped[SongFileType] = mapped_column(
        Enum(SongFileType, name="song_file_type"), nullable=False
    )
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(255))
    size_bytes: Mapped[int | None] = mapped_column()
    checksum: Mapped[str | None] = mapped_column(String(128), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    song = relationship("Song", back_populates="files")
