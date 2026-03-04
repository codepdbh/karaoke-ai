from __future__ import annotations


class ExternalLyricsProviderAdapter:
    """Stub listo para reemplazar por proveedores externos como LRCLIB."""

    def fetch(self, title: str, artist: str | None = None) -> dict | None:
        if not title:
            return None
        return {
            "provider": "none",
            "matched": False,
            "reference_text": None,
            "similarity": 0.0,
            "title": title,
            "artist": artist,
        }

