Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
}
finally {
    Pop-Location
}
