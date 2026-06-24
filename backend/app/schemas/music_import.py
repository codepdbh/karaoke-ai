from __future__ import annotations

from pydantic import BaseModel, Field


class MusicSearchResult(BaseModel):
    source_id: str
    source_label: str
    title: str
    artist: str | None = None
    album: str | None = None
    year: str | None = None
    license_url: str | None = None
    duration_seconds: int | None = None
    download_url: str
    filename: str
    mime_type: str | None = None
    size_bytes: int | None = None
    cover_url: str | None = None


class MusicImportRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)
    title: str | None = Field(default=None, max_length=255)
    artist: str | None = Field(default=None, max_length=255)
    album: str | None = Field(default=None, max_length=255)
    language: str | None = Field(default=None, max_length=12)
    rights_confirmed: bool = False
