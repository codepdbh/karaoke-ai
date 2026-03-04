FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

COPY backend/requirements.txt /tmp/backend-requirements.txt
COPY workers/requirements.txt /tmp/worker-requirements.txt
RUN pip install --no-cache-dir -r /tmp/backend-requirements.txt -r /tmp/worker-requirements.txt

COPY backend /app/backend
COPY workers /app/workers
COPY shared /app/shared
COPY README.md /app/README.md

CMD ["python", "-m", "celery", "-A", "workers.app.celery_app:celery_app", "worker", "--loglevel=info"]
