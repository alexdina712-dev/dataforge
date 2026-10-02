$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$pythonExe = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonExe)) {
    $bundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
    if (Test-Path -LiteralPath $bundledPython) { & $bundledPython -m venv .venv }
    elseif (Get-Command py -ErrorAction SilentlyContinue) { & py -3.12 -m venv .venv }
    else { & python -m venv .venv }
    if ($LASTEXITCODE -ne 0) { throw 'Install Python 3.12, then try again.' }
}
& $pythonExe -c 'import sys; sys.exit(0 if sys.version_info[:2] == (3,12) else 1)'
if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 is required for the tested dependency lock.' }
if (-not (Test-Path -LiteralPath '.venv\.dataforge-installed')) {
    & $pythonExe -m pip install -r backend/requirements-dev.txt
    if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
    New-Item -ItemType File -Path '.venv\.dataforge-installed' -Force | Out-Null
}
$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
$bundledPnpm = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd'
if ($pnpmCommand) { $pnpmExe = $pnpmCommand.Source }
elseif (Test-Path -LiteralPath $bundledPnpm) { $pnpmExe = $bundledPnpm }
else { throw 'Install Node 22+ and pnpm 11.19.0, then try again.' }
if (-not (Test-Path -LiteralPath 'node_modules\vite')) {
    & $pnpmExe install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
}
$runtimeDir = Join-Path $projectRoot '.runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$nodeExe = (Get-Command node).Source
$launcher = Join-Path $PSScriptRoot 'local-server.mjs'
$launcherRunning = $false
$stateFile = Join-Path $runtimeDir 'server.json'
if (Test-Path -LiteralPath $stateFile) {
    try {
        $launcherState = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
        if ($launcherState.root -ne $projectRoot) { throw 'Launcher root mismatch.' }
        $controlState = Invoke-RestMethod 'http://127.0.0.1:5177/control' -Headers @{'X-DataForge-Control'=$launcherState.token} -TimeoutSec 2
        if ($controlState.root -eq $projectRoot) { $launcherRunning = $true }
    } catch {}
}
if (-not $launcherRunning) {
    Start-Process -FilePath $nodeExe -ArgumentList @(('"' + $launcher + '"'), 'start') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'launcher.log') -RedirectStandardError (Join-Path $runtimeDir 'launcher-error.log')
}
$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try { $api = Invoke-RestMethod 'http://127.0.0.1:8004/api/health' -TimeoutSec 2; $web = Invoke-WebRequest 'http://127.0.0.1:5176' -UseBasicParsing -TimeoutSec 2; if ($api.status -eq 'ok' -and $web.StatusCode -eq 200) { $ready = $true; break } } catch {}
    Start-Sleep -Milliseconds 500
}
if (-not $ready) { throw 'DataForge did not start. Check .runtime logs; make sure ports 8004/5176/5177 are free.' }
Write-Host 'DataForge is ready: http://127.0.0.1:5176'
if ($env:DATAFORGE_NO_BROWSER -ne '1') { Start-Process 'http://127.0.0.1:5176' }
