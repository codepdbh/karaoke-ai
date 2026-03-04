from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.enums import JobStatus, JobType
from backend.app.models.job import Job


class JobRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self) -> list[Job]:
        return list(self.session.scalars(select(Job).order_by(Job.created_at.desc())))

    def get(self, job_id: int) -> Job | None:
        return self.session.get(Job, job_id)

    def get_active_song_process_job(self, song_id: int) -> Job | None:
        statement = (
            select(Job)
            .where(
                Job.song_id == song_id,
                Job.job_type == JobType.process_song,
                Job.status.in_([JobStatus.queued, JobStatus.running]),
            )
            .order_by(Job.created_at.desc())
        )
        return self.session.scalar(statement)
