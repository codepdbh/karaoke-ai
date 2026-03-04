Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    python -m celery -A workers.app.celery_app:celery_app worker --loglevel=info
}
finally {
    Pop-Location
}
