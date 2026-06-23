from __future__ import annotations

import ipaddress
import json
import logging
import socket
import tempfile
from dataclasses import dataclass
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen

from fastapi import HTTPException, status

from backend.app.schemas.music_import import MusicSearchResult
from backend.app.utils.files import ALLOWED_EXTENSIONS, sanitize_filename
from backend.app.SpotiFLAC import SpotiFLAC, SpotifyMetadataClient
from backend.app.SpotiFLAC.downloader import SpotiflacDownloader, DownloadOptions

USER_AGENT = "KaraokeAI/1.0 (+https://rutasingluten.lat/karaoke-ia)"
ARCHIVE_SEARCH_URL = "https://archive.org/advancedsearch.php"
ARCHIVE_METADATA_URL = "https://archive.org/metadata/{identifier}"
MAX_SEARCH_RESULTS = 12
DOWNLOAD_TIMEOUT_SECONDS = 30

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DownloadedAudio:
    content: bytes
    filename: str
    content_type: str | None


def _read_json_url(url: str, timeout: int = 15) -> dict:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo consultar la biblioteca externa.",
        ) from exc


def _string_value(value: object) -> str | None:
    if isinstance(value, list):
        return _string_value(value[0]) if value else None
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _int_value(value: object) -> int | None:
    text = _string_value(value)
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def _file_size(file_info: dict) -> int | None:
    raw_size = _string_value(file_info.get("size"))
    if not raw_size:
        return None
    try:
        return int(raw_size)
    except ValueError:
        return None


def _is_allowed_audio_file(file_info: dict, max_size_bytes: int) -> bool:
    name = _string_value(file_info.get("name"))
    if not name:
        return False
    if Path(name).suffix.lower() not in ALLOWED_EXTENSIONS:
        return False
    size_bytes = _file_size(file_info)
    if size_bytes is not None and size_bytes > max_size_bytes:
        return False
    return True


def _pick_archive_audio_file(identifier: str, max_size_bytes: int) -> dict | None:
    metadata_url = ARCHIVE_METADATA_URL.format(identifier=quote(identifier, safe=""))
    payload = _read_json_url(metadata_url)
    files = payload.get("files")
    if not isinstance(files, list):
        return None

    allowed = [
        file_info
        for file_info in files
        if isinstance(file_info, dict) and _is_allowed_audio_file(file_info, max_size_bytes)
    ]
    if not allowed:
        return None

    extension_priority = {".flac": 0, ".wav": 1, ".m4a": 2, ".mp3": 3}
    return sorted(
        allowed,
        key=lambda item: (
            extension_priority.get(Path(_string_value(item.get("name")) or "").suffix.lower(), 9),
            _file_size(item) or max_size_bytes + 1,
        ),
    )[0]


def search_open_audio(query: str, *, max_size_bytes: int, limit: int = 8) -> list[MusicSearchResult]:
    cleaned = query.strip()
    if len(cleaned) < 2:
        return []

    try:
        client = SpotifyMetadataClient()
        search_results = client.search(cleaned, limit=limit)
        tracks = search_results.get("tracks", [])
    except Exception as exc:
        logger.exception("Error searching Spotify via SpotiFLAC")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo consultar el servicio de búsqueda de música: {str(exc)}",
        ) from exc

    results: list[MusicSearchResult] = []
    for track in tracks:
        safe_title = sanitize_filename(track.title)
        safe_artist = sanitize_filename(track.artists) if track.artists else "Unknown"
        filename = f"{safe_artist} - {safe_title}.flac"

        results.append(
            MusicSearchResult(
                source_id=track.id,
                source_label="Spotify",
                title=track.title,
                artist=track.artists,
                album=track.album,
                year=track.year or None,
                license_url=None,
                duration_seconds=int(track.duration_ms / 1000) if track.duration_ms else None,
                download_url=track.external_url,
                filename=filename,
                mime_type="audio/flac",
                size_bytes=None,
                cover_url=track.cover_url,
            )
        )

    return results[:limit]


def _is_spotiflac_url(url: str) -> bool:
    url_lower = url.lower()
    return any(
        domain in url_lower
        for domain in [
            "spotify.com",
            "spotify:",
            "tidal.com",
            "music.apple.com",
            "soundcloud.com",
            "youtube.com",
            "youtu.be",
            "pandora.com",
        ]
    )


def _download_via_spotiflac(url: str, max_size_bytes: int) -> DownloadedAudio:
    try:
        opts_meta = DownloadOptions(output_dir="/tmp")
        downloader = SpotiflacDownloader(opts_meta)
        _collection_name, tracks, _info = downloader._resolve_metadata(url)
        if not tracks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se encontraron canciones en la URL proporcionada.",
            )
        if len(tracks) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se admiten listas de reproducción ni álbumes completos. Introduce la URL de una canción individual.",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al analizar el enlace con SpotiFLAC: {str(exc)}",
        ) from exc

    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            SpotiFLAC(
                url=url,
                output_dir=tmpdir,
                services=["flacdownloader"],
                quality="LOSSLESS",
                log_level=logging.WARNING,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fallo al descargar la canción con SpotiFLAC: {str(exc)}",
            ) from exc

        files = [path for path in Path(tmpdir).glob("**/*") if path.is_file()]
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo encontrar el archivo descargado por SpotiFLAC.",
            )

        file_path = files[0]
        content = file_path.read_bytes()

        if len(content) > max_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="El archivo descargado supera el límite permitido.",
            )

        return DownloadedAudio(
            content=content,
            filename=file_path.name,
            content_type="audio/flac",
        )


def _assert_public_http_url(raw_url: str) -> None:
    parsed = urlparse(raw_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usa una URL directa http o https de un archivo de audio.",
        )

    hostname = parsed.hostname.lower()
    if hostname in {"localhost", "127.0.0.1", "::1"} or hostname.endswith(".local"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esa URL no se puede importar.")

    try:
        addresses = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo resolver esa URL.") from exc

    for address in addresses:
        ip_value = address[4][0]
        try:
            ip = ipaddress.ip_address(ip_value)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esa URL no se puede importar.")
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esa URL no se puede importar.")


def _filename_from_response(raw_url: str, headers: object) -> str:
    parsed_name = Path(urlparse(raw_url).path).name
    filename = sanitize_filename(parsed_name or "imported-audio.mp3")
    if Path(filename).suffix.lower() not in ALLOWED_EXTENSIONS:
        content_type = getattr(headers, "get", lambda _key, _default=None: None)("Content-Type", "")
        fallback_extension = (
            ".mp3"
            if "mpeg" in content_type
            else ".wav"
            if "wav" in content_type
            else ".flac"
            if "flac" in content_type
            else ".m4a"
            if "mp4" in content_type
            else ""
        )
        filename = f"{Path(filename).stem or 'imported-audio'}{fallback_extension}"
    return filename


def download_authorized_audio(raw_url: str, *, max_size_bytes: int) -> DownloadedAudio:
    if _is_spotiflac_url(raw_url):
        return _download_via_spotiflac(raw_url, max_size_bytes)

    _assert_public_http_url(raw_url)

    request = Request(raw_url, headers={"User-Agent": USER_AGENT, "Accept": "audio/*,*/*;q=0.8"})
    try:
        with urlopen(request, timeout=DOWNLOAD_TIMEOUT_SECONDS) as response:
            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) > max_size_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="El archivo supera el limite permitido.",
                )

            chunks: list[bytes] = []
            total = 0
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_size_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="El archivo supera el limite permitido.",
                    )
                chunks.append(chunk)

            filename = _filename_from_response(response.geturl(), response.headers)
            if Path(filename).suffix.lower() not in ALLOWED_EXTENSIONS:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de audio no soportado.")

            content_type = response.headers.get("Content-Type")
            if content_type and "text/html" in content_type.lower():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La URL no apunta a un audio directo.")

            return DownloadedAudio(content=b"".join(chunks), filename=filename, content_type=content_type)
    except HTTPException:
        raise
    except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo descargar ese audio.") from exc
