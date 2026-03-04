from __future__ import annotations

import hashlib
import mimetypes
import re
from pathlib import Path

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a"}


def sanitize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def sanitize_filename(filename: str) -> str:
    name = Path(filename).name
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)


def validate_extension(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported audio format")
    return suffix


def checksum_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def fingerprint_from_checksum(checksum: str) -> str:
    return checksum[:32]


def detect_mime_type(filename: str, fallback: str | None = None) -> str:
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or fallback or "application/octet-stream"

