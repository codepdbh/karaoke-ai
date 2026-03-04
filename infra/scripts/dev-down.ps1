Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    docker compose -f infra/compose/docker-compose.dev.yml down --remove-orphans
}
finally {
    Pop-Location
}
