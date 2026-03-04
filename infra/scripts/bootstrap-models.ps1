Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    python backend/scripts/bootstrap_models.py --download
}
finally {
    Pop-Location
}
