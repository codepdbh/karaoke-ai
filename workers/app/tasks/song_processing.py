from __future__ import annotations

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
from workers.app.processors.transcription import transcribe_vocals
from workers.app.shared.runtime import (
    get_song_with_original_file,
    mark_song_status,
    session_scope,
    update_job,
    upsert_song_file,
)


@celery_app.task(name="workers.process_song")
def process_song(job_id: int, song_id: int) -> dict:
    settings = get_settings()
    storage = StorageService()

    try:
        with session_scope() as session:
            update_job(
                session,
                job_id=job_id,
                status=JobStatus.running,
                progress_percent=5,
                current_step="loading-song",
                error_message=None,
            )
            mark_song_status(session, song_id=song_id, status=SongStatus.processing)
            song, original_file = get_song_with_original_file(session, song_id)
            original_path = storage.resolve(original_file.storage_path)

            metadata = extract_metadata(original_path)
            song.duration_seconds = metadata["duration_seconds"]
            song.language = song.language or metadata["detected_language"]

            update_job(session, job_id=job_id, progress_percent=20, current_step="waveform")
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

            update_job(session, job_id=job_id, progress_percent=40, current_step="separation")
            stems_dir = settings.storage_root_path / f"songs/{song_id}/stems"
            stems = separate_stems(original_path, stems_dir)
            for stem_name, file_type in {
                "vocals": SongFileType.vocals,
                "instrumental": SongFileType.instrumental,
            }.items():
                path = stems[stem_name]
                relative_path = str(path.relative_to(settings.storage_root_path))
                upsert_song_file(
                    session,
                    song_id=song_id,
                    file_type=file_type,
                    storage_path=relative_path,
                    mime_type=original_file.mime_type,
                    size_bytes=path.stat().st_size,
                    checksum=None,
                )

            update_job(session, job_id=job_id, progress_percent=60, current_step="transcription")
            transcript = transcribe_vocals(stems["vocals"], language=song.language)

            update_job(session, job_id=job_id, progress_percent=75, current_step="alignment")
            aligned = align_transcript(stems["vocals"], transcript)
            lines = build_lines_payload(aligned)

            update_job(session, job_id=job_id, progress_percent=85, current_step="comparison")
            reference = compare_with_reference(song.title, song.artist)

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
                user_id=song.created_by,
            )

            update_job(session, job_id=job_id, progress_percent=95, current_step="export")
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
            update_job(
                session,
                job_id=job_id,
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
