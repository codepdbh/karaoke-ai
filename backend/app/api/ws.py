from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.db.session import SessionLocal
from backend.app.services.job import JobService

router = APIRouter()


@router.websocket("/ws/jobs/{job_id}")
async def job_progress_ws(websocket: WebSocket, job_id: int) -> None:
    await websocket.accept()
    try:
        while True:
            with SessionLocal() as session:
                service = JobService(session)
                job = service.get_or_404(job_id)
                await websocket.send_json(
                    {
                        "id": job.id,
                        "song_id": job.song_id,
                        "job_type": job.job_type,
                        "status": job.status,
                        "progress_percent": job.progress_percent,
                        "current_step": job.current_step,
                        "error_message": job.error_message,
                        "result_json": job.result_json,
                        "created_at": job.created_at.isoformat(),
                        "updated_at": job.updated_at.isoformat(),
                    }
                )
                if job.status in {"completed", "failed", "cancelled"}:
                    break
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return
