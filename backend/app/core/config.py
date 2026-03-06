from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "karaoke-ai-api"
    app_env: str = "development"
    secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    database_url: str = "sqlite+pysqlite:///./karaoke.db"
    redis_url: str = "redis://localhost:6379/0"
    storage_mode: str = "local"
    local_storage_root: str = "storage"
    model_root: str = "models"
    faster_whisper_model_dir: str = "models/faster-whisper"
    faster_whisper_model_name: str = "small"
    faster_whisper_device: str = "cpu"
    faster_whisper_compute_type: str = "int8"
    faster_whisper_beam_size: int = 5
    whisperx_model_dir: str = "models/whisperx"
    whisperx_device: str = "cpu"
    whisperx_default_align_language: str = "es"
    separation_model_dir: str = "models/audio-separator"
    separation_model_filename: str = "UVR_MDXNET_KARA_2.onnx"
    separation_output_format: str = "wav"
    allow_model_downloads: bool = False
    external_lyrics_provider: str = "none"
    lrclib_base_url: str = "https://lrclib.net/api"
    cors_origins: str = "http://localhost:3000"
    max_upload_size_mb: int = 100
    celery_worker_pool: str = "threads"
    celery_worker_concurrency: int = 3
    celery_worker_prefetch_multiplier: int = 1

    model_config = SettingsConfigDict(
        env_file=("backend/.env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @computed_field
    @property
    def storage_root_path(self) -> Path:
        return self.resolve_project_path(self.local_storage_root)

    @computed_field
    @property
    def model_root_path(self) -> Path:
        return self.resolve_project_path(self.model_root)

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def required_model_paths(self) -> dict[str, Path]:
        return {
            "faster_whisper": self.resolve_project_path(self.faster_whisper_model_dir),
            "whisperx": self.resolve_project_path(self.whisperx_model_dir),
            "audio_separator": self.resolve_project_path(self.separation_model_dir),
        }

    def resolve_project_path(self, raw_path: str) -> Path:
        path = Path(raw_path)
        if path.is_absolute():
            return path
        return (PROJECT_ROOT / path).resolve()


def ensure_runtime_dirs(settings: Settings) -> None:
    settings.storage_root_path.mkdir(parents=True, exist_ok=True)
    settings.model_root_path.mkdir(parents=True, exist_ok=True)


def model_path_has_payload(path: Path) -> bool:
    if not path.exists():
        return False
    ignored = {"README.txt", ".installed.json"}
    return any(child.name not in ignored for child in path.iterdir())


def validate_model_layout(settings: Settings) -> dict[str, bool]:
    state: dict[str, bool] = {}
    for name, path in settings.required_model_paths.items():
        marker_path = path / ".installed.json"
        marker_ready = False
        if marker_path.exists():
            try:
                marker_payload = marker_path.read_text(encoding="utf-8")
                marker_ready = '"status": "ready"' in marker_payload or '"status": "present"' in marker_payload
            except OSError:
                marker_ready = False
        state[name] = marker_ready or model_path_has_payload(path)
    return state


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    ensure_runtime_dirs(settings)
    return settings
