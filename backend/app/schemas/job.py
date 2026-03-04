from __future__ import annotations

from datetime import datetime

from backend.app.models.enums import JobStatus, JobType
from backend.app.schemas.common import ORMModel


class JobRead(ORMModel):
    id: int
    song_id: int | None
    job_type: JobType
    status: JobStatus
    progress_percent: int
    current_step: str | None
    error_message: str | None
    payload_json: dict | None
    result_json: dict | None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None

