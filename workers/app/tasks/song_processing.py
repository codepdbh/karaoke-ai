from __future__ import annotations

import threading
import time
from collections.abc import Callable
from typing import TypeVar

from fastapi import HTTPException

from backend.app.core.config import get_settings
from backend.app.models.enums import (
    JobStatus,
    LyricsSourceProvider,
    LyricsVersionSourceType,
    LyricsVersionStatus,
    SongFileType,
    SongStatus,
)
from backend.app.models.user import User
from backend.app.schemas.lyrics import LyricsVersionCreate
from backend.app.services.lyrics import LyricsService
from backend.app.services.storage import StorageService
from workers.app.celery_app import celery_app
from workers.app.pipelines.song_pipeline import build_lines_payload
from workers.app.processors.alignment import align_transcript
from workers.app.processors.cleanup import cleanup_temp_files
from workers.app.processors.export import export_lyrics_assets, export_waveform
from workers.app.processors.ingestion import build_waveform_points, extract_metadata
from workers.app.processors.lyrics_comparison import compare_with_reference
from workers.app.processors.separation import separate_stems
from workers.app.processors.transcoding import build_stream_mp3
from workers.app.processors.transcription import transcribe_vocals
from workers.app.shared.runtime import (
    get_song_with_original_file,
    mark_song_status,
    session_scope,
    update_job,
    upsert_song_file,
)

T = TypeVar("T")


def _run_with_estimated_progress(
    work: Callable[[], T],
    *,
    job_id: int,
    start_percent: int,
    end_percent: int,
    current_step: str,
    estimated_seconds: int,
) -> T:
    """Keep long blocking audio steps visibly moving in the UI."""

    stop_event = threading.Event()
    estimated_seconds = max(estimated_seconds, 30)

    def heartbeat() -> None:
        started_at = time.monotonic()
        last_percent = start_percent

        while not stop_event.wait(3):
            elapsed = time.monotonic() - started_at
            ratio = min(elapsed / estimated_seconds, 0.96)
            next_percent = min(
                end_percent - 1,
                start_percent + max(1, int((end_percent - start_percent) * ratio)),
            )

            if next_percent <= last_percent:
                continue

            last_percent = next_percent
            with session_scope() as heartbeat_session:
                update_job(
                    heartbeat_session,
                    job_id=job_id,
                    status=JobStatus.running,
                    progress_percent=next_percent,
                    current_step=current_step,
                )

    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    try:
        return work()
    finally:
        stop_event.set()
        thread.join(timeout=1)


@celery_app.task(name="workers.process_song")
def process_song(job_id: int, song_id: int) -> dict:
    settings = get_settings()
    storage = StorageService()

    try:
        with session_scope() as session:
            def push_progress(
                *,
                progress_percent: int,
                current_step: str,
                status: JobStatus | None = None,
                error_message: str | None = None,
                result_json: dict | None = None,
            ) -> None:
                update_job(
                    session,
                    job_id=job_id,
                    status=status,
                    progress_percent=progress_percent,
                    current_step=current_step,
                    error_message=error_message,
                    result_json=result_json,
                )
                session.commit()

            mark_song_status(session, song_id=song_id, status=SongStatus.processing)
            push_progress(
                status=JobStatus.running,
                progress_percent=5,
                current_step="loading-song",
                error_message=None,
            )
            song, original_file = get_song_with_original_file(session, song_id)
            original_path = storage.resolve(original_file.storage_path)
            if original_path.suffix.lower() != ".mp3":
                build_stream_mp3(original_path)

            push_progress(progress_percent=12, current_step="metadata")
            metadata = extract_metadata(original_path)
            song.duration_seconds = metadata["duration_seconds"]
            song.language = song.language or metadata["detected_language"]

            push_progress(progress_percent=22, current_step="waveform")
            waveform_export = export_waveform(song_id, build_waveform_points())
            upsert_song_file(
                session,
                song_id=song_id,
                file_type=SongFileType.waveform,
                storage_path=waveform_export["relative_path"],
                mime_type=waveform_export["mime_type"],
                size_bytes=waveform_export["size_bytes"],
                checksum=waveform_export["checksum"],
            )

            push_progress(progress_percent=38, current_step="separation")
            stems_dir = settings.storage_root_path / f"songs/{song_id}/stems"
            estimated_duration = max(song.duration_seconds or 180, 60)
            stems = _run_with_estimated_progress(
                lambda: separate_stems(original_path, stems_dir),
                job_id=job_id,
                start_percent=38,
                end_percent=62,
                current_step="separation",
                estimated_seconds=int(estimated_duration * 1.45),
            )
            for stem_name, file_type in {
                "vocals": SongFileType.vocals,
                "instrumental": SongFileType.instrumental,
            }.items():
                path = stems[stem_name]
                stream_path = build_stream_mp3(path, delete_source=True)
                stems[stem_name] = stream_path
                relative_path = str(stream_path.relative_to(settings.storage_root_path))
                upsert_song_file(
                    session,
                    song_id=song_id,
                    file_type=file_type,
                    storage_path=relative_path,
                    mime_type="audio/mpeg",
                    size_bytes=stream_path.stat().st_size,
                    checksum=None,
                )

            push_progress(progress_percent=62, current_step="transcription")
            transcript = _run_with_estimated_progress(
                lambda: transcribe_vocals(stems["vocals"], language=song.language),
                job_id=job_id,
                start_percent=62,
                end_percent=78,
                current_step="transcription",
                estimated_seconds=int(estimated_duration * 0.55),
            )

            push_progress(progress_percent=78, current_step="alignment")
            aligned = align_transcript(stems["vocals"], transcript)
            lines = build_lines_payload(aligned)

            push_progress(progress_percent=88, current_step="comparison")
            reference = compare_with_reference(song.title, song.artist)

            owner = session.get(User, song.created_by) if song.created_by else None
            if not owner:
                raise ValueError("Song owner not found for lyrics version creation")

            version = LyricsService(session).create_version(
                song_id,
                LyricsVersionCreate(
                    version_name="Auto transcription",
                    source_type=LyricsVersionSourceType.local_transcription,
                    source_provider=LyricsSourceProvider.local,
                    status=LyricsVersionStatus.reviewed,
                    language=aligned.get("language") or song.language,
                    confidence_score=0.9,
                    lines=lines,
                ),
                owner,
            )

            push_progress(progress_percent=94, current_step="export")
            exported = export_lyrics_assets(song_id, version.id, version.language, lines)
            for file_type, file_key in {
                SongFileType.lyrics_json: "lyrics_json",
                SongFileType.lrc: "lrc",
            }.items():
                file_info = exported[file_key]
                upsert_song_file(
                    session,
                    song_id=song_id,
                    file_type=file_type,
                    storage_path=file_info["relative_path"],
                    mime_type=file_info["mime_type"],
                    size_bytes=file_info["size_bytes"],
                    checksum=file_info["checksum"],
                )

            mark_song_status(session, song_id=song_id, status=SongStatus.ready)
            push_progress(
                status=JobStatus.completed,
                progress_percent=100,
                current_step="completed",
                result_json={
                    "version_id": version.id,
                    "lyrics": exported["payload"],
                    "reference": reference,
                },
            )
            cleanup_temp_files()
            return {"job_id": job_id, "song_id": song_id, "version_id": version.id}
    except Exception as exc:
        with session_scope() as session:
            mark_song_status(session, song_id=song_id, status=SongStatus.failed)
            update_job(
                session,
                job_id=job_id,
                status=JobStatus.failed,
                progress_percent=100,
                current_step="failed",
                error_message=str(exc),
                result_json={"error": str(exc)},
            )
        if isinstance(exc, HTTPException):
            raise
        raise
