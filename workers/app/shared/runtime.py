from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.session import SessionLocal
from backend.app.models.enums import JobStatus, SongFileType, SongStatus
from backend.app.models.job import Job
from backend.app.models.song import Song, SongFile


@contextmanager
def session_scope() -> Session:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_song_with_original_file(session: Session, song_id: int) -> tuple[Song, SongFile]:
    song = session.get(Song, song_id)
    if not song:
        raise ValueError("Song not found")
    original_file = session.scalar(
        select(SongFile).where(
            SongFile.song_id == song_id,
            SongFile.file_type == SongFileType.original,
        )
    )
    if not original_file:
        raise ValueError("Original file not found")
    return song, original_file


def upsert_song_file(
    session: Session,
    *,
    song_id: int,
    file_type: SongFileType,
    storage_path: str,
    mime_type: str | None,
    size_bytes: int,
    checksum: str | None = None,
) -> SongFile:
    record = session.scalar(
        select(SongFile).where(SongFile.song_id == song_id, SongFile.file_type == file_type)
    )
    if record:
        record.storage_path = storage_path
        record.mime_type = mime_type
        record.size_bytes = size_bytes
        record.checksum = checksum
        return record

    record = SongFile(
        song_id=song_id,
        file_type=file_type,
        storage_path=storage_path,
        mime_type=mime_type,
        size_bytes=size_bytes,
        checksum=checksum,
    )
    session.add(record)
    return record


def update_job(
    session: Session,
    *,
    job_id: int,
    status: JobStatus | None = None,
    progress_percent: int | None = None,
    current_step: str | None = None,
    error_message: str | None = None,
    result_json: dict | None = None,
) -> Job:
    job = session.get(Job, job_id)
    if not job:
        raise ValueError("Job not found")
    if status is not None:
        job.status = status
        if status in {JobStatus.completed, JobStatus.failed, JobStatus.cancelled}:
            job.finished_at = datetime.now(timezone.utc)
    if progress_percent is not None:
        job.progress_percent = progress_percent
    if current_step is not None:
        job.current_step = current_step
    if error_message is not None:
        job.error_message = error_message
    if result_json is not None:
        job.result_json = result_json
    return job


def mark_song_status(session: Session, *, song_id: int, status: SongStatus) -> None:
    song = session.get(Song, song_id)
    if song:
        song.status = status


def resolve_storage_path(relative_path: str, storage_root: Path) -> Path:
    return (storage_root / relative_path).resolve()

