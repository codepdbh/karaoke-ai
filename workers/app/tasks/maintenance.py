from __future__ import annotations

from workers.app.celery_app import celery_app


@celery_app.task(name="workers.cleanup")
def cleanup() -> dict:
    return {"status": "noop"}

