from __future__ import annotations

from celery import Celery
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.models.enums import JobStatus, JobType, SongStatus
from backend.app.models.job import Job
from backend.app.repositories.job import JobRepository
from backend.app.repositories.song import SongRepository


def build_celery_client() -> Celery:
    settings = get_settings()
    return Celery("karaoke-ai-client", broker=settings.redis_url, backend=settings.redis_url)


class JobService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.jobs = JobRepository(session)
        self.songs = SongRepository(session)
        self.celery_client = build_celery_client()

    def list(self) -> list[Job]:
        return self.jobs.list()

    def get_or_404(self, job_id: int) -> Job:
        job = self.jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        return job

    def create_song_processing_job(self, song_id: int) -> Job:
        song = self.songs.get(song_id)
        if not song:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Song not found")

        song.status = SongStatus.processing
        job = Job(
            song_id=song_id,
            job_type=JobType.process_song,
            status=JobStatus.queued,
            progress_percent=0,
            current_step="queued",
            payload_json={"song_id": song_id},
        )
        self.session.add(job)
        self.session.commit()
        self.session.refresh(job)
        self.celery_client.send_task("workers.process_song", args=[job.id, song_id])
        return job

