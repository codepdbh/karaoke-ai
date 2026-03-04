from __future__ import annotations

from backend.app.schemas.lyrics import LyricsLinePayload


def _format_timestamp(seconds: float) -> str:
    minutes = int(seconds // 60)
    remainder = seconds - (minutes * 60)
    return f"{minutes:02d}:{remainder:05.2f}"


def lyrics_to_lrc(lines: list[LyricsLinePayload]) -> str:
    output = [f"[{_format_timestamp(line.start)}] {line.text}" for line in sorted(lines, key=lambda item: item.line_index)]
    return "\n".join(output) + ("\n" if output else "")

