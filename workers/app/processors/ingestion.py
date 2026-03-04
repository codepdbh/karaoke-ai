from __future__ import annotations

from pathlib import Path


def extract_metadata(original_path: Path) -> dict:
    return {
        "duration_seconds": 180,
        "detected_language": "es",
        "source_name": original_path.stem,
    }


def build_waveform_points() -> list[float]:
    return [0.1, 0.35, 0.7, 0.45, 0.2, 0.6, 0.8, 0.25]

