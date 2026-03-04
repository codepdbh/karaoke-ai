# Model Bootstrap

The first iteration keeps model installation idempotent and local.

## Script

- Python entrypoint: `backend/scripts/bootstrap_models.py`
- PowerShell helper: `infra/scripts/bootstrap-models.ps1`

## Modes

- `--check`: validates that each configured model directory exists and contains an installation marker
  or files.
- `--download`: creates the required directories and writes one-time installation markers.

## Managed paths

- `models/faster-whisper`
- `models/whisperx`
- `models/audio-separator`

## Integration plan

Replace the marker-writing section in `backend/scripts/bootstrap_models.py` with real download logic
when production model installers are selected. The backend and workers already validate these paths
on startup through `backend.app.core.config.validate_model_layout`.
