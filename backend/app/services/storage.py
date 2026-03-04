from __future__ import annotations

import shutil
from pathlib import Path

from backend.app.core.config import get_settings


class StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.root = self.settings.storage_root_path

    def write_bytes(self, relative_path: str, content: bytes) -> Path:
        destination = self.root / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        return destination

    def write_text(self, relative_path: str, content: str) -> Path:
        destination = self.root / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(content, encoding="utf-8")
        return destination

    def resolve(self, relative_path: str) -> Path:
        return (self.root / relative_path).resolve()

    def delete_tree(self, relative_path: str) -> None:
        target = self.root / relative_path
        if target.exists():
            shutil.rmtree(target, ignore_errors=True)

