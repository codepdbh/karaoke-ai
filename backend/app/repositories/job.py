from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.job import Job


class JobRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self) -> list[Job]:
        return list(self.session.scalars(select(Job).order_by(Job.created_at.desc())))

    def get(self, job_id: int) -> Job | None:
        return self.session.get(Job, job_id)

