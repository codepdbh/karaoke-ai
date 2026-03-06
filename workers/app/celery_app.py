from __future__ import annotations

from celery import Celery

from backend.app.core.config import get_settings, validate_model_layout
from backend.app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

celery_app = Celery("karaoke-ai-worker", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    worker_pool=settings.celery_worker_pool,
    worker_concurrency=settings.celery_worker_concurrency,
    worker_prefetch_multiplier=settings.celery_worker_prefetch_multiplier,
)
logger.info(
    "Celery worker configured with pool='%s', concurrency=%s, prefetch_multiplier=%s.",
    settings.celery_worker_pool,
    settings.celery_worker_concurrency,
    settings.celery_worker_prefetch_multiplier,
)

missing = [name for name, ok in validate_model_layout(settings).items() if not ok]
if missing:
    logger.warning("Worker started with missing model directories: %s", ", ".join(missing))

celery_app.autodiscover_tasks(["workers.app.tasks"])
