from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.enums import SongFileType, SongStatus
from backend.app.models.song import Song, SongFile
from backend.app.models.user import User
from backend.app.repositories.song import SongRepository
from backend.app.services.storage import StorageService
from backend.app.utils.files import (
    checksum_bytes,
    detect_mime_type,
    fingerprint_from_checksum,
    sanitize_filename,
    sanitize_text,
    validate_extension,
)


class SongService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.songs = SongRepository(session)
        self.storage = StorageService()

    def create_from_upload(
        self,
        *,
        content: bytes,
        filename: str,
        content_type: str | None,
        current_user: User,
        title: str | None = None,
        artist: str | None = None,
        album: str | None = None,
        language: str | None = None,
        max_size_bytes: int,
    ) -> Song:
        if len(content) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty upload")
        if len(content) > max_size_bytes:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

        try:
            extension = validate_extension(filename)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        checksum = checksum_bytes(content)
        fingerprint = fingerprint_from_checksum(checksum)

        song = Song(
            title=sanitize_text(title or Path(filename).stem),
            artist=sanitize_text(artist) if artist else None,
            album=sanitize_text(album) if album else None,
            language=language,
            status=SongStatus.uploaded,
            audio_fingerprint=fingerprint,
            created_by=current_user.id,
        )
        self.session.add(song)
        self.session.flush()

        safe_name = sanitize_filename(f"original{extension}")
        relative_path = f"songs/{song.id}/audio/{safe_name}"
        self.storage.write_bytes(relative_path, content)

        song_file = SongFile(
            song_id=song.id,
            file_type=SongFileType.original,
            storage_path=relative_path,
            mime_type=detect_mime_type(filename, content_type),
            size_bytes=len(content),
            checksum=checksum,
        )
        self.session.add(song_file)
        self.session.commit()
        self.session.refresh(song)
        return song

    def list(self, query: str | None = None) -> list[Song]:
        return self.songs.list(query)

    def get_or_404(self, song_id: int) -> Song:
        song = self.songs.get(song_id)
        if not song:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Song not found")
        return song

    def delete(self, song_id: int) -> None:
        song = self.get_or_404(song_id)
        self.storage.delete_tree(f"songs/{song_id}")
        self.session.delete(song)
        self.session.commit()

    def get_stream_path(self, song_id: int, file_type: SongFileType) -> Path:
        song_file = self.songs.get_file(song_id, file_type)
        if not song_file:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not available")
        path = self.storage.resolve(song_file.storage_path)
        if not path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Storage file missing")
        return path

