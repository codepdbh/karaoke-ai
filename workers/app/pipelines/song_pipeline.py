from __future__ import annotations

from backend.app.schemas.lyrics import LyricsLinePayload, WordTimingPayload

PIPELINE_STEPS = [
    ("metadata", 10),
    ("waveform", 20),
    ("separation", 40),
    ("transcription", 60),
    ("alignment", 75),
    ("comparison", 85),
    ("export", 95),
    ("completed", 100),
]


def build_lines_payload(aligned_result: dict) -> list[LyricsLinePayload]:
    lines: list[LyricsLinePayload] = []
    for line in aligned_result.get("lines", []):
        lines.append(
            LyricsLinePayload(
                line_index=line["line_index"],
                text=line["text"],
                start=float(line["start"]),
                end=float(line["end"]),
                confidence=line.get("confidence"),
                words=[
                    WordTimingPayload(
                        word_index=word["word_index"],
                        text=word["text"],
                        start=float(word["start"]),
                        end=float(word["end"]),
                        confidence=word.get("confidence"),
                    )
                    for word in line.get("words", [])
                ],
            )
        )
    return lines

