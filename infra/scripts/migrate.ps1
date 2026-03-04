Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    python -m alembic -c backend/alembic.ini upgrade head
}
finally {
    Pop-Location
}
