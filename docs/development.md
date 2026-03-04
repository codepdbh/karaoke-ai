# Development Notes

## Local services

- Frontend: `http://localhost:3000`
- Backend docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Common commands

- PowerShell stack up: `./infra/scripts/dev-up.ps1`
- PowerShell stack down: `./infra/scripts/dev-down.ps1`
- Backend dev server: `./infra/scripts/backend-dev.ps1`
- Frontend dev server: `./infra/scripts/frontend-dev.ps1`
- Worker dev server: `./infra/scripts/worker-dev.ps1`
- Migrations: `./infra/scripts/migrate.ps1`
- Model bootstrap: `./infra/scripts/bootstrap-models.ps1`

## Suggested first run

1. Copy `backend/.env.example` to `backend/.env`.
2. Copy `frontend/.env.example` to `frontend/.env.local`.
3. Bootstrap local model directories.
4. Start Docker services or run the three dev scripts separately.
5. Run Alembic migrations.
6. Create a user with `POST /api/v1/auth/register`.

## Current stub boundaries

- `python-audio-separator` is wrapped behind `AudioSeparatorAdapter`.
- `faster-whisper` is wrapped behind `FasterWhisperAdapter`.
- `WhisperX` is wrapped behind `WhisperXAdapter`.
- External lyrics providers are wrapped behind `ExternalLyricsProviderAdapter`.

Each adapter currently returns deterministic local stub data so the app boots before the real AI
integrations are wired.
