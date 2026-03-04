Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$frontendRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\frontend")
Push-Location $frontendRoot
try {
    npm run dev
}
finally {
    Pop-Location
}
