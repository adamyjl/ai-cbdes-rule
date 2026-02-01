$ErrorActionPreference = 'Stop'

function Assert-Command($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (!$cmd) {
    throw "Missing command: $name (please install/configure it in PATH)"
  }
}

function Resolve-NpmRunner {
  $candidates = @('npm.cmd', 'npm.exe', 'npm')
  $cmd = $null
  foreach ($n in $candidates) {
    $cmd = Get-Command $n -ErrorAction SilentlyContinue
    if ($cmd) { break }
  }
  if (!$cmd) {
    throw 'Missing command: npm'
  }

  $src = $cmd.Source
  if ($src -and $src.ToLower().EndsWith('.ps1')) {
    return @{ file = 'powershell'; prefix = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $src) }
  }
  return @{ file = $cmd.Name; prefix = @() }
}

function Start-LoggedProcess {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$ArgumentList,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$LogDir
  )

  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $out = Join-Path $LogDir ("$Name.out.log")
  $err = Join-Path $LogDir ("$Name.err.log")
  try {
    if (Test-Path $out) { Remove-Item -Force $out -ErrorAction Stop }
    if (Test-Path $err) { Remove-Item -Force $err -ErrorAction Stop }
  } catch {
    $out = Join-Path $LogDir ("$Name.$stamp.out.log")
    $err = Join-Path $LogDir ("$Name.$stamp.err.log")
  }

  $p = Start-Process -PassThru -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory -RedirectStandardOutput $out -RedirectStandardError $err
  Start-Sleep -Milliseconds 400
  if ($p.HasExited) {
    throw "Process '$Name' exited early (code=$($p.ExitCode)). See logs: $out ; $err"
  }
  return @{ pid = $p.Id; out = $out; err = $err }
}

function Wait-HttpOk {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$Retries = 20,
    [int]$DelayMs = 500
  )
  for ($i = 0; $i -lt $Retries; $i++) {
    try {
      $resp = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 2
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) { return $true }
    } catch {
      Start-Sleep -Milliseconds $DelayMs
    }
  }
  return $false
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repoRoot

Write-Host "Repo: $repoRoot"
Assert-Command node
Assert-Command npm
Assert-Command py

$logDir = Join-Path $repoRoot '.logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Write-Host "Checking Python 3.13 launcher..."
try {
  py -3.13 -c "import sys; print(sys.version)" | Out-Null
} catch {
  throw "Python 3.13 not found. Please install Python 3.13 and ensure 'py -3.13' works."
}

$venvDir = Join-Path $env:LOCALAPPDATA 'venvs\ai-cbdes-rule-py313'
if (!(Test-Path $venvDir)) {
  py -3.13 -m venv $venvDir
}

& "$venvDir\Scripts\python.exe" -m pip install -r backend\requirements.txt | Out-Null

if (!(Test-Path (Join-Path $repoRoot 'node_modules'))) {
  Write-Host 'Installing frontend dependencies (npm install)...'
  $npmRun = Resolve-NpmRunner
  & $npmRun.file @($npmRun.prefix + @('install'))
}

Write-Host "Starting FastAPI on http://127.0.0.1:8000"
$pyInfo = Start-LoggedProcess -Name 'fastapi' -FilePath "$venvDir\Scripts\uvicorn.exe" -ArgumentList @('backend.app.main:app','--host','127.0.0.1','--port','8000','--reload') -WorkingDirectory $repoRoot -LogDir $logDir

Write-Host "Starting Express API on http://127.0.0.1:3001"
$npmRun = Resolve-NpmRunner
$apiInfo = Start-LoggedProcess -Name 'express' -FilePath $npmRun.file -ArgumentList @($npmRun.prefix + @('run','api:dev')) -WorkingDirectory $repoRoot -LogDir $logDir

Write-Host "Starting Frontend on http://127.0.0.1:5173"
$feInfo = Start-LoggedProcess -Name 'vite' -FilePath $npmRun.file -ArgumentList @($npmRun.prefix + @('run','dev')) -WorkingDirectory $repoRoot -LogDir $logDir

$okApi = Wait-HttpOk -Url 'http://127.0.0.1:3001/api/health'
$okPy = Wait-HttpOk -Url 'http://127.0.0.1:8000/health'

Write-Host "PIDs: fastapi=$($pyInfo.pid) express=$($apiInfo.pid) vite=$($feInfo.pid)"
Write-Host "Logs: $logDir"
if (!$okApi) { Write-Host "WARN: Express health check failed. See $($apiInfo.err)" }
if (!$okPy) { Write-Host "WARN: FastAPI health check failed. See $($pyInfo.err)" }
Write-Host "Done. Open http://127.0.0.1:5173/"
