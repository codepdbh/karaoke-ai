from __future__ import annotations

from backend.app.integrations.lyrics_provider import ExternalLyricsProviderAdapter


def compare_with_reference(title: str, artist: str | None) -> dict | None:
    return ExternalLyricsProviderAdapter().fetch(title, artist)

