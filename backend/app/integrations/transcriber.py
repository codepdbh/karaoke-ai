from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from backend.app.core.config import get_settings, model_path_has_payload


@lru_cache(maxsize=1)
def _build_whisper_model() -> Any:
    settings = get_settings()

    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError(
            "faster-whisper is not installed. Run `pip install -r workers/requirements.txt`."
        ) from exc

    model_dir = settings.required_model_paths["faster_whisper"]
    if not model_path_has_payload(model_dir) and not settings.allow_model_downloads:
        raise RuntimeError(
            "faster-whisper cache is empty. Run `python -m backend.scripts.bootstrap_models --download` "
            "or set ALLOW_MODEL_DOWNLOADS=true."
        )

    return WhisperModel(
        settings.faster_whisper_model_name,
        device=settings.faster_whisper_device,
        compute_type=settings.faster_whisper_compute_type,
        download_root=str(model_dir),
    )


class FasterWhisperAdapter:
    """Real faster-whisper wrapper that stores downloads under models/faster-whisper."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def transcribe(self, vocals_path: Path, language: str | None = None) -> dict:
        model = _build_whisper_model()
        segments_iter, info = model.transcribe(
            str(vocals_path),
            language=language,
            beam_size=self.settings.faster_whisper_beam_size,
            vad_filter=True,
            word_timestamps=True,
        )

        segments: list[dict[str, Any]] = []
        for segment in segments_iter:
            words: list[dict[str, Any]] = []
            for word in segment.words or []:
                if word.start is None or word.end is None:
                    continue
                words.append(
                    {
                        "word": word.word.strip(),
                        "start": float(word.start),
                        "end": float(word.end),
                        "probability": float(word.probability) if word.probability is not None else None,
                    }
                )

            segments.append(
                {
                    "id": getattr(segment, "id", len(segments)),
                    "start": float(segment.start),
                    "end": float(segment.end),
                    "text": segment.text.strip(),
                    "words": words,
                }
            )

        return {
            "language": getattr(info, "language", language),
            "language_probability": getattr(info, "language_probability", None),
            "segments": segments,
            "audio_path": str(vocals_path),
        }
