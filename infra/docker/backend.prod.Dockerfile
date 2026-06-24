FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

COPY backend/requirements.txt /tmp/backend-requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip pip install -r /tmp/backend-requirements.txt

COPY backend /app/backend
COPY workers /app/workers
COPY shared /app/shared
COPY README.md /app/README.md

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
