from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from backend.app.core.config import get_settings, model_path_has_payload


def _normalize_word_items(raw_words: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for index, word in enumerate(raw_words or []):
        start = word.get("start")
        end = word.get("end")
        if start is None or end is None:
            continue
        normalized.append(
            {
                "word_index": index,
                "text": str(word.get("word") or word.get("text") or "").strip(),
                "start": float(start),
                "end": float(end),
                "confidence": word.get("score", word.get("probability")),
            }
        )
    return normalized


def _convert_segments_to_lines(segments: list[dict[str, Any]], language: str | None) -> dict:
    lines: list[dict[str, Any]] = []
    for index, segment in enumerate(segments):
        words = _normalize_word_items(segment.get("words"))
        lines.append(
            {
                "line_index": index,
                "text": str(segment.get("text", "")).strip(),
                "start": float(segment.get("start", 0.0)),
                "end": float(segment.get("end", segment.get("start", 0.0))),
                "confidence": segment.get("avg_logprob") or segment.get("score") or 0.0,
                "words": words,
            }
        )
    return {"language": language, "lines": lines}


@lru_cache(maxsize=8)
def _load_align_model(language_code: str) -> tuple[Any, Any]:
    settings = get_settings()

    try:
        import whisperx
    except ImportError as exc:
        raise RuntimeError(
            "WhisperX is not installed. Run `pip install -r workers/requirements.txt`."
        ) from exc

    model_dir = settings.required_model_paths["whisperx"]
    if not model_path_has_payload(model_dir) and not settings.allow_model_downloads:
        raise RuntimeError(
            "WhisperX cache is empty. Run `python -m backend.scripts.bootstrap_models --download` "
            "or set ALLOW_MODEL_DOWNLOADS=true."
        )

    return whisperx.load_align_model(
        language_code=language_code,
        device=settings.whisperx_device,
        model_dir=str(model_dir),
    )


class WhisperXAdapter:
    """Word-level aligner using WhisperX, with real fallback to faster-whisper word timestamps."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def _fallback_from_transcript(self, transcript: dict) -> dict:
        return _convert_segments_to_lines(transcript.get("segments", []), transcript.get("language"))

    def align(self, vocals_path: Path, transcript: dict) -> dict:
        language_code = (transcript.get("language") or self.settings.whisperx_default_align_language).strip()

        try:
            import whisperx
        except ImportError:
            return self._fallback_from_transcript(transcript)

        try:
            model_a, metadata = _load_align_model(language_code)
            audio = whisperx.load_audio(str(vocals_path))
            aligned = whisperx.align(
                transcript.get("segments", []),
                model_a,
                metadata,
                audio,
                self.settings.whisperx_device,
                return_char_alignments=False,
            )
            return _convert_segments_to_lines(aligned.get("segments", []), aligned.get("language", language_code))
        except Exception:
            if any(segment.get("words") for segment in transcript.get("segments", [])):
                return self._fallback_from_transcript(transcript)
            raise
