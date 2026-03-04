from __future__ import annotations

from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    editor = "editor"
    listener = "listener"


class SongStatus(str, Enum):
    uploaded = "uploaded"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class SongSourceType(str, Enum):
    upload = "upload"
    import_ = "import"


class SongFileType(str, Enum):
    original = "original"
    vocals = "vocals"
    instrumental = "instrumental"
    waveform = "waveform"
    lyrics_json = "lyrics_json"
    lrc = "lrc"
    cover = "cover"


class LyricsVersionSourceType(str, Enum):
    manual = "manual"
    external_reference = "external_reference"
    local_transcription = "local_transcription"
    merged = "merged"


class LyricsSourceProvider(str, Enum):
    none = "none"
    lrclib = "lrclib"
    manual = "manual"
    local = "local"


class LyricsVersionStatus(str, Enum):
    draft = "draft"
    reviewed = "reviewed"
    published = "published"
    deprecated = "deprecated"


class JobType(str, Enum):
    process_song = "process_song"
    export_lrc = "export_lrc"
    reprocess_lyrics = "reprocess_lyrics"


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"

