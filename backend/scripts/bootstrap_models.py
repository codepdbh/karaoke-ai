from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.app.core.config import get_settings, model_path_has_payload


@dataclass(frozen=True)
class ManagedModel:
    key: str
    target_dir: Path
    summary: str


class ModelBootstrapper:
    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        self.model_root = settings.model_root_path
        self.runtime_required_keys = {"faster_whisper", "audio_separator"}
        self.models = [
            ManagedModel(
                key="faster_whisper",
                target_dir=settings.required_model_paths["faster_whisper"],
                summary="Cache for faster-whisper model files.",
            ),
            ManagedModel(
                key="whisperx",
                target_dir=settings.required_model_paths["whisperx"],
                summary="Cache for WhisperX alignment assets.",
            ),
            ManagedModel(
                key="audio_separator",
                target_dir=settings.required_model_paths["audio_separator"],
                summary="Cache for python-audio-separator weights.",
            ),
        ]

    def _marker_path(self, model: ManagedModel) -> Path:
        return model.target_dir / ".installed.json"

    def _write_marker(self, model: ManagedModel, details: dict[str, Any]) -> None:
        marker_path = self._marker_path(model)
        marker_path.write_text(
            json.dumps(
                {
                    "model": model.key,
                    "installed_at": datetime.now(timezone.utc).isoformat(),
                    "summary": model.summary,
                    **details,
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    def check(self) -> dict[str, bool]:
        states: dict[str, bool] = {}
        for model in self.models:
            states[model.key] = model_path_has_payload(model.target_dir)
        return states

    def _download_audio_separator(self, model: ManagedModel) -> bool:
        try:
            from audio_separator.separator import Separator
        except ImportError:
            return False

        expected_model = model.target_dir / self.settings.separation_model_filename
        if not expected_model.exists():
            separator = Separator(
                output_dir=str(model.target_dir),
                output_format=self.settings.separation_output_format,
                model_file_dir=str(model.target_dir),
            )
            separator.load_model(model_filename=self.settings.separation_model_filename)

        ready = expected_model.exists() or model_path_has_payload(model.target_dir)
        if ready:
            self._write_marker(
                model,
                {
                    "status": "ready",
                    "model_filename": self.settings.separation_model_filename,
                },
            )
        return ready

    def _download_faster_whisper(self, model: ManagedModel) -> bool:
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            return False

        WhisperModel(
            self.settings.faster_whisper_model_name,
            device=self.settings.faster_whisper_device,
            compute_type=self.settings.faster_whisper_compute_type,
            download_root=str(model.target_dir),
        )

        ready = model_path_has_payload(model.target_dir)
        if ready:
            self._write_marker(
                model,
                {
                    "status": "ready",
                    "model_name": self.settings.faster_whisper_model_name,
                },
            )
        return ready

    def _download_whisperx(self, model: ManagedModel) -> bool:
        try:
            import whisperx
        except ImportError:
            return False

        whisperx.load_align_model(
            language_code=self.settings.whisperx_default_align_language,
            device=self.settings.whisperx_device,
            model_dir=str(model.target_dir),
        )

        ready = model_path_has_payload(model.target_dir)
        if ready:
            self._write_marker(
                model,
                {
                    "status": "ready",
                    "language_code": self.settings.whisperx_default_align_language,
                },
            )
        return ready

    def download(self) -> dict[str, bool]:
        self.model_root.mkdir(parents=True, exist_ok=True)
        for model in self.models:
            model.target_dir.mkdir(parents=True, exist_ok=True)
            readme_path = model.target_dir / "README.txt"
            if not readme_path.exists():
                readme_path.write_text(model.summary, encoding="utf-8")

        results = {
            "faster_whisper": self._download_faster_whisper(self.models[0]),
            "whisperx": self._download_whisperx(self.models[1]),
            "audio_separator": self._download_audio_separator(self.models[2]),
        }

        for model in self.models:
            if results.get(model.key):
                continue
            if model_path_has_payload(model.target_dir):
                self._write_marker(
                    model,
                    {
                        "status": "present",
                        "note": "Directory contains files but automatic bootstrap could not verify them.",
                    },
                )
            else:
                self._write_marker(
                    model,
                    {
                        "status": "pending",
                        "note": (
                            "Install the runtime dependency for this integration and rerun with --download "
                            "to populate the model cache."
                        ),
                    },
                )

        return self.check()

    def print_status(self, states: dict[str, bool]) -> None:
        print(f"MODEL_ROOT={self.model_root}")
        for key, ok in states.items():
            status = "READY" if ok else "MISSING"
            print(f"- {key}: {status}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bootstrap and validate local model directories.")
    parser.add_argument("--check", action="store_true", help="Validate the configured model layout.")
    parser.add_argument("--download", action="store_true", help="Download or warm local model caches.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    bootstrapper = ModelBootstrapper()

    if args.download:
        states = bootstrapper.download()
        bootstrapper.print_status(states)
        required_ready = all(states.get(key, False) for key in bootstrapper.runtime_required_keys)
        return 0 if required_ready else 1

    states = bootstrapper.check()
    bootstrapper.print_status(states)
    required_ready = all(states.get(key, False) for key in bootstrapper.runtime_required_keys)
    return 0 if required_ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
