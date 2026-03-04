from __future__ import annotations

from pathlib import Path

from backend.app.integrations.transcriber import FasterWhisperAdapter


def transcribe_vocals(vocals_path: Path, language: str | None = None) -> dict:
    return FasterWhisperAdapter().transcribe(vocals_path, language=language)

