from __future__ import annotations

import json

from backend.app.schemas.lyrics import LyricsLinePayload
from backend.app.utils.files import checksum_bytes
from backend.app.utils.lrc import lyrics_to_lrc
from backend.app.services.storage import StorageService


def export_waveform(song_id: int, waveform_points: list[float]) -> dict:
    storage = StorageService()
    relative_path = f"songs/{song_id}/waveforms/default.json"
    content = json.dumps({"song_id": song_id, "points": waveform_points}, indent=2)
    storage.write_text(relative_path, content)
    encoded = content.encode("utf-8")
    return {
        "relative_path": relative_path,
        "size_bytes": len(encoded),
        "checksum": checksum_bytes(encoded),
        "mime_type": "application/json",
    }


def export_lyrics_assets(song_id: int, version_id: int, language: str | None, lines: list[LyricsLinePayload]) -> dict:
    storage = StorageService()
    payload = {
        "song_id": song_id,
        "language": language,
        "version_id": version_id,
        "lines": [line.model_dump() for line in lines],
    }
    json_relative_path = f"songs/{song_id}/lyrics/lyrics-v{version_id}.json"
    json_content = json.dumps(payload, indent=2, ensure_ascii=True)
    storage.write_text(json_relative_path, json_content)
    json_bytes = json_content.encode("utf-8")

    lrc_relative_path = f"songs/{song_id}/lyrics/lyrics-v{version_id}.lrc"
    lrc_content = lyrics_to_lrc(lines)
    storage.write_text(lrc_relative_path, lrc_content)
    lrc_bytes = lrc_content.encode("utf-8")

    return {
        "payload": payload,
        "lyrics_json": {
            "relative_path": json_relative_path,
            "size_bytes": len(json_bytes),
            "checksum": checksum_bytes(json_bytes),
            "mime_type": "application/json",
        },
        "lrc": {
            "relative_path": lrc_relative_path,
            "size_bytes": len(lrc_bytes),
            "checksum": checksum_bytes(lrc_bytes),
            "mime_type": "text/plain",
        },
    }

