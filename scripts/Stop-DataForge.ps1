$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'local-server.mjs') stop
if ($LASTEXITCODE -ne 0) { throw 'Could not authenticate this DataForge launcher. No other application was stopped.' }
