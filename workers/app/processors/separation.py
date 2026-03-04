from __future__ import annotations

from pathlib import Path

from backend.app.integrations.audio_separator import AudioSeparatorAdapter


def separate_stems(original_path: Path, output_dir: Path) -> dict[str, Path]:
    return AudioSeparatorAdapter().separate(original_path, output_dir)

