from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from backend.app.schemas.common import ORMModel


class PlaylistCreate(BaseModel):
    name: str
    description: str | None = None
    song_ids: list[int] = Field(default_factory=list)


class PlaylistUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    song_ids: list[int] | None = None


class PlaylistSongRead(ORMModel):
    id: int
    song_id: int
    sort_order: int


class PlaylistRead(ORMModel):
    id: int
    user_id: int
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    songs: list[PlaylistSongRead]

