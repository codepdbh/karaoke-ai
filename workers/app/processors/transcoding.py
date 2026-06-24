from __future__ import annotations

import subprocess
from pathlib import Path

from backend.app.core.config import get_settings


def build_stream_mp3(source_path: Path, *, delete_source: bool = False) -> Path:
    settings = get_settings()
    output_path = source_path.with_suffix(".mp3")

    if output_path.exists() and output_path.stat().st_mtime >= source_path.stat().st_mtime:
        if delete_source and source_path.exists():
            source_path.unlink()
        return output_path

    output_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(source_path),
            "-vn",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            settings.stream_audio_bitrate,
            str(output_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if delete_source and source_path.exists():
        source_path.unlink()
    return output_path
