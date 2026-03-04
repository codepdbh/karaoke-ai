from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.job import JobRead
from backend.app.services.job import JobService

router = APIRouter(tags=["jobs"])


@router.post("/songs/{song_id}/process", response_model=JobRead)
def process_song(
    song_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> JobRead:
    job = JobService(db).create_song_processing_job(song_id)
    return JobRead.model_validate(job)


@router.get("/jobs/{job_id}", response_model=JobRead)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> JobRead:
    return JobRead.model_validate(JobService(db).get_or_404(job_id))


@router.get("/jobs", response_model=list[JobRead])
def list_jobs(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[JobRead]:
    return [JobRead.model_validate(job) for job in JobService(db).list()]

