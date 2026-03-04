from __future__ import annotations

from pathlib import Path
from typing import Any

from backend.app.core.config import get_settings, model_path_has_payload


class AudioSeparatorAdapter:
    """Thin wrapper around python-audio-separator with local model cache support."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def _resolve_separator(self, output_dir: Path) -> Any:
        try:
            from audio_separator.separator import Separator
        except ImportError as exc:
            raise RuntimeError(
                "python-audio-separator is not installed in this environment. On Windows with Python 3.14, "
                "its diffq-fixed dependency currently blocks local installation. Use a separate <=3.13 "
                "environment or the official beveradb/audio-separator Docker image."
            ) from exc

        model_dir = self.settings.required_model_paths["audio_separator"]
        expected_model = model_dir / self.settings.separation_model_filename

        if not expected_model.exists() and not self.settings.allow_model_downloads and not model_path_has_payload(model_dir):
            raise RuntimeError(
                "Audio separation model is missing. Run `python -m backend.scripts.bootstrap_models --download` "
                "or set ALLOW_MODEL_DOWNLOADS=true for runtime downloads."
            )

        output_dir.mkdir(parents=True, exist_ok=True)
        separator = Separator(
            output_dir=str(output_dir),
            output_format=self.settings.separation_output_format,
            model_file_dir=str(model_dir),
        )
        separator.load_model(model_filename=self.settings.separation_model_filename)
        return separator

    def _normalize_output_paths(self, raw_output: Any, output_dir: Path) -> list[Path]:
        if isinstance(raw_output, (str, Path)):
            items = [raw_output]
        else:
            items = list(raw_output or [])

        paths: list[Path] = []
        for item in items:
            path = Path(item)
            if not path.is_absolute():
                path = (output_dir / path.name).resolve()
            paths.append(path)
        return paths

    def _classify_stems(self, paths: list[Path]) -> dict[str, Path]:
        vocals: Path | None = None
        instrumental: Path | None = None

        for path in paths:
            name = path.name.lower()
            if "vocal" in name and vocals is None:
                vocals = path
                continue
            if any(token in name for token in ("instrument", "karaoke", "no_vocal", "novocal")):
                instrumental = path

        if len(paths) == 2:
            vocals = vocals or paths[0]
            instrumental = instrumental or next(path for path in paths if path != vocals)

        if not vocals or not instrumental:
            raise RuntimeError(
                "audio-separator did not return recognizable vocals/instrumental files."
            )

        return {"vocals": vocals, "instrumental": instrumental}

    def separate(self, source_audio: Path, output_dir: Path) -> dict[str, Path]:
        separator = self._resolve_separator(output_dir)
        raw_output = separator.separate(str(source_audio))
        output_paths = self._normalize_output_paths(raw_output, output_dir)
        return self._classify_stems(output_paths)
