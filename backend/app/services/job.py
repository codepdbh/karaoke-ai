from __future__ import annotations

from celery import Celery
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.models.enums import JobStatus, JobType, SongStatus, UserRole
from backend.app.models.job import Job
from backend.app.models.user import User
from backend.app.repositories.job import JobRepository
from backend.app.repositories.song import SongRepository
from backend.app.services.song import SongService


def build_celery_client() -> Celery:
    settings = get_settings()
    return Celery("karaoke-ai-client", broker=settings.redis_url, backend=settings.redis_url)


class JobService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.jobs = JobRepository(session)
        self.songs = SongRepository(session)
        self.song_service = SongService(session)
        self.celery_client = build_celery_client()

    def list(self) -> list[Job]:
        return self.jobs.list()

    def get_or_404(self, job_id: int) -> Job:
        job = self.jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajo no encontrado")
        return job

    def create_song_processing_job(self, song_id: int, current_user: User) -> Job:
        song = self.songs.get(song_id)
        if not song:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cancion no encontrada")

        active_job = self.jobs.get_active_song_process_job(song_id)
        if active_job:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"La cancion ya tiene un trabajo activo #{active_job.id}",
            )

        self.song_service.assert_can_manage(song, current_user)

        if current_user.role != UserRole.admin:
            if current_user.credits_remaining <= 0:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes creditos disponibles para procesar otra cancion",
                )
            current_user.credits_remaining -= 1

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
