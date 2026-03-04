from __future__ import annotations

from pathlib import Path

from backend.app.integrations.aligner import WhisperXAdapter


def align_transcript(vocals_path: Path, transcript: dict) -> dict:
    return WhisperXAdapter().align(vocals_path, transcript)
