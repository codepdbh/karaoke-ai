from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from backend.app.models.enums import (
    LyricsSourceProvider,
    LyricsVersionSourceType,
    LyricsVersionStatus,
)
from backend.app.schemas.common import ORMModel


class WordTimingPayload(BaseModel):
    word_index: int
    text: str
    start: float
    end: float
    confidence: float | None = None


class LyricsLinePayload(BaseModel):
    line_index: int
    text: str
    start: float
    end: float
    confidence: float | None = None
    words: list[WordTimingPayload] = Field(default_factory=list)


class LyricsVersionCreate(BaseModel):
    version_name: str
    source_type: LyricsVersionSourceType = LyricsVersionSourceType.manual
    source_provider: LyricsSourceProvider = LyricsSourceProvider.manual
    status: LyricsVersionStatus = LyricsVersionStatus.draft
    language: str | None = None
    confidence_score: float | None = None
    is_locked: bool = False
    lines: list[LyricsLinePayload] = Field(default_factory=list)


class LyricsVersionUpdate(BaseModel):
    version_name: str | None = None
    status: LyricsVersionStatus | None = None
    language: str | None = None
    confidence_score: float | None = None
    is_locked: bool | None = None
    lines: list[LyricsLinePayload] | None = None


class WordTimingRead(ORMModel):
    id: int
    word_index: int
    word: str
    start_time: float | None
    end_time: float | None
    confidence_score: float | None


class LyricsLineRead(ORMModel):
    id: int
    line_index: int
    text: str
    start_time: float | None
    end_time: float | None
    confidence_score: float | None
    words: list[WordTimingRead]


class LyricsVersionRead(ORMModel):
    id: int
    song_id: int
    version_name: str
    source_type: LyricsVersionSourceType
    source_provider: LyricsSourceProvider
    status: LyricsVersionStatus
    language: str | None
    confidence_score: float | None
    is_locked: bool
    created_by: int | None
    created_at: datetime
    updated_at: datetime
    lines: list[LyricsLineRead]


class LyricsPayloadRead(BaseModel):
    song_id: int
    language: str | None
    version_id: int
    lines: list[LyricsLinePayload]

