Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    $workerPool = if ($env:CELERY_WORKER_POOL) { $env:CELERY_WORKER_POOL } else { "threads" }
    $workerConcurrency = if ($env:CELERY_WORKER_CONCURRENCY) { $env:CELERY_WORKER_CONCURRENCY } else { "3" }
    python -m celery -A workers.app.celery_app:celery_app worker --loglevel=info --pool=$workerPool --concurrency=$workerConcurrency
}
finally {
    Pop-Location
}
