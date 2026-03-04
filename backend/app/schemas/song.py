from __future__ import annotations

from datetime import datetime

from backend.app.models.enums import SongFileType, SongSourceType, SongStatus
from backend.app.schemas.common import ORMModel


class SongFileRead(ORMModel):
    id: int
    file_type: SongFileType
    storage_path: str
    mime_type: str | None
    size_bytes: int | None
    checksum: str | None
    created_at: datetime


class SongRead(ORMModel):
    id: int
    title: str
    artist: str | None
    album: str | None
    duration_seconds: int | None
    language: str | None
    status: SongStatus
    source_type: SongSourceType
    audio_fingerprint: str | None
    created_by: int | None
    created_at: datetime
    updated_at: datetime


class SongDetail(SongRead):
    files: list[SongFileRead]

