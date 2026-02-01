param(
  [Parameter(Mandatory = $true)] [string] $DataDir,
  [Parameter(Mandatory = $true)] [string] $PublicHost,
  [string] $NpmRegistry = '',
  [switch] $NpmVerbose = $false,
  [string] $AppDir = (Get-Location).Path,
  [int] $FastApiPort = 8000,
  [int] $ExpressPort = 3001,
  [int] $HttpPort = 80
)

$ErrorActionPreference = 'Stop'

function Require-Command($name) {
  $c = Get-Command $name -ErrorAction SilentlyContinue
  if (!$c) {
    throw "missing command: $name"
  }
  return $c
}

function Resolve-ExePath($candidates) {
  foreach ($p in $candidates) {
    if (!$p) { continue }
    if (Test-Path $p) { return $p }
  }
  return $null
}

function Resolve-PythonExe() {
  $cmd = Get-Command python -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source -and ($cmd.Source -notmatch 'WindowsApps\\python\.exe$')) {
    return $cmd.Source
  }

  $p = Resolve-ExePath @(
    (Join-Path $env:LocalAppData 'Programs\Python\Python313\python.exe'),
    'C:\Program Files\Python313\python.exe',
    'C:\Python313\python.exe'
  )
  if ($p) { return $p }

  throw 'missing command: python (install non-Store Python 3.13 and ensure python.exe is available)'
}

function Resolve-NodeExe() {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  $p = Resolve-ExePath @(
    'C:\Program Files\nodejs\node.exe',
    'C:\Program Files (x86)\nodejs\node.exe'
  )
  if ($p) { return $p }
  throw 'missing command: node'
}

function Resolve-NpmCmd() {
  $cmd = Get-Command npm -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  $p = Resolve-ExePath @(
    'C:\Program Files\nodejs\npm.cmd',
    'C:\Program Files (x86)\nodejs\npm.cmd'
  )
  if ($p) { return $p }
  throw 'missing command: npm'
}

function Resolve-GitExe() {
  $cmd = Get-Command git -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  $p = Resolve-ExePath @(
    'C:\Program Files\Git\cmd\git.exe',
    'C:\Program Files\Git\bin\git.exe',
    'C:\Program Files (x86)\Git\cmd\git.exe'
  )
  if ($p) { return $p }
  throw 'missing command: git'
}

function Write-Info($msg) {
  Write-Host "[deploy] $msg"
}

function Ensure-Dir($p) {
  New-Item -ItemType Directory -Force -Path $p | Out-Null
}

function Set-MachineEnv($name, $value) {
  [Environment]::SetEnvironmentVariable($name, $value, 'Machine')
  Set-Item -Path ("Env:$name") -Value $value
}

function Install-CaddyIfMissing($caddyDir) {
  $caddyExe = Join-Path $caddyDir 'caddy.exe'
  if (Test-Path $caddyExe) { return $caddyExe }
  Ensure-Dir $caddyDir
  $url = 'https://caddyserver.com/api/download?os=windows&arch=amd64'
  Write-Info "download caddy: $url"
  $download = Join-Path $caddyDir 'caddy.download'
  Invoke-WebRequest -Uri $url -OutFile $download
  $b0 = [System.IO.File]::ReadAllBytes($download)[0..1]
  if ($b0[0] -eq 0x4D -and $b0[1] -eq 0x5A) {
    Move-Item -Force $download $caddyExe
  } elseif ($b0[0] -eq 0x50 -and $b0[1] -eq 0x4B) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $tmpDir = Join-Path $caddyDir '__caddy_extract'
    if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }
    New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
    [System.IO.Compression.ZipFile]::ExtractToDirectory($download, $tmpDir)
    $extracted = Join-Path $tmpDir 'caddy.exe'
    if (!(Test-Path $extracted)) { throw 'caddy download failed (caddy.exe missing in zip)' }
    Move-Item -Force $extracted $caddyExe
    Remove-Item -Recurse -Force $tmpDir
    Remove-Item $download -Force
  } else {
    throw 'caddy download failed (unexpected format)'
  }
  if (!(Test-Path $caddyExe)) {
    throw 'caddy download failed'
  }
  return $caddyExe
}

function Ensure-PythonVenv($venvDir) {
  $pythonExe = Resolve-PythonExe
  if (!(Test-Path (Join-Path $venvDir 'Scripts\python.exe'))) {
    Write-Info 'create python venv'
    & $pythonExe -m venv $venvDir
  }
  return (Join-Path $venvDir 'Scripts\python.exe')
}

function Ensure-NpmInstall($dir, $npmRegistry, $npmVerbose) {
  $nodeExe = Resolve-NodeExe
  $npmCmd = Resolve-NpmCmd
  $nodeDir = Split-Path -Parent $nodeExe
  if ($env:Path -notlike "$nodeDir*") {
    $env:Path = "$nodeDir;$env:Path"
  }
  Push-Location $dir
  try {
    Write-Info 'npm ci'
    $args = @('ci', '--no-audit', '--no-fund', '--no-progress')
    if ($npmVerbose) {
      $args += @('--loglevel', 'verbose', '--timing', '--foreground-scripts')
    }
    if ($npmRegistry) {
      $args += @('--registry', $npmRegistry)
    }
    Write-Info ("npm args: " + ($args -join ' '))
    & $npmCmd @args
  } finally {
    Pop-Location
  }
}

function Ensure-FrontendBuild($dir) {
  $nodeExe = Resolve-NodeExe
  $npmCmd = Resolve-NpmCmd
  $nodeDir = Split-Path -Parent $nodeExe
  if ($env:Path -notlike "$nodeDir*") {
    $env:Path = "$nodeDir;$env:Path"
  }
  Push-Location $dir
  try {
    Write-Info 'build frontend'
    & $npmCmd run build
  } finally {
    Pop-Location
  }
}

function Write-Caddyfile($path, $siteRoot, $fastApiPort, $expressPort, $httpPort, $publicHost) {
  $host = ($publicHost -replace '^https?://', '').TrimEnd('/')
  if (!$host) {
    throw 'PublicHost is empty'
  }
  $alt = ''
  if ($host.ToLower().StartsWith('www.')) {
    $alt = $host.Substring(4)
  }

  $hostsHttps = @("https://$host")
  if ($alt) { $hostsHttps += @("https://$alt") }
  $hostsHttpsText = ($hostsHttps -join ', ')

  $hostsHttp = @("http://$host")
  if ($alt) { $hostsHttp += @("http://$alt") }
  $hostsHttpText = ($hostsHttp -join ', ')

  $caddyfile = @"
{
}

(ai_cbdes_app) {
  handle_path /py/* {
    reverse_proxy 127.0.0.1:$fastApiPort
  }

  handle /api/* {
    reverse_proxy 127.0.0.1:$expressPort
  }

  handle {
    root * $siteRoot
    try_files {path} /index.html
    file_server
  }
}

$hostsHttpText {
  redir https://$host{uri} permanent
}

$hostsHttpsText {
  import ai_cbdes_app
}

http://localhost, http://127.0.0.1 {
  import ai_cbdes_app
}

http://:$httpPort {
  redir https://$host{uri} permanent
}
"@
  $caddyfile | Out-File -FilePath $path -Encoding utf8
}

function Write-StartCmds($binDir, $venvPython, $appDir, $fastApiPort, $expressPort, $caddyExe, $caddyfilePath) {
  Ensure-Dir $binDir
  $startFastApi = Join-Path $binDir 'start_fastapi.cmd'
  $startExpress = Join-Path $binDir 'start_express.cmd'
  $startCaddy = Join-Path $binDir 'start_caddy.cmd'

  $fastApiCmd = @"
@echo off
cd /d "$appDir"
set PYTHONUTF8=1
"$venvPython" -m uvicorn backend.app.main:app --host 127.0.0.1 --port $fastApiPort
"@
  $fastApiCmd | Out-File -FilePath $startFastApi -Encoding ascii

  $expressCmd = @"
@echo off
cd /d "$appDir"
set PORT=$expressPort
"$npmCmd" run api
"@
  $expressCmd | Out-File -FilePath $startExpress -Encoding ascii

  $caddyCmd = @"
@echo off
cd /d "$appDir"
"$caddyExe" run --config "$caddyfilePath"
"@
  $caddyCmd | Out-File -FilePath $startCaddy -Encoding ascii

  return @{
    FastApi = $startFastApi
    Express = $startExpress
    Caddy = $startCaddy
  }
}

function Ensure-Nssm($binDir) {
  $nssm = Get-Command nssm -ErrorAction SilentlyContinue
  if ($nssm) { return $nssm.Source }

  $nssmDir = Join-Path $binDir 'nssm'
  Ensure-Dir $nssmDir
  $zip = Join-Path $nssmDir 'nssm.zip'
  $url = 'https://nssm.cc/release/nssm-2.24.zip'
  Write-Info "download nssm: $url"
  Invoke-WebRequest -Uri $url -OutFile $zip
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $tmpDir = Join-Path $nssmDir '__nssm_extract'
  if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }
  New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
  [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $tmpDir)
  Copy-Item -Recurse -Force (Join-Path $tmpDir '*') $nssmDir
  Remove-Item -Recurse -Force $tmpDir
  Remove-Item $zip -Force

  $exe = Get-ChildItem -Recurse -File -Filter nssm.exe -Path $nssmDir | Where-Object { $_.FullName -match 'win64' } | Select-Object -First 1
  if (!$exe) { throw 'nssm.exe not found after download' }
  return $exe.FullName
}

function Install-ServiceIfMissing($nssmExe, $serviceName, $cmdPath, $workDir) {
  $svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
  if ($svc) {
    Write-Info "service exists: $serviceName"
    return
  }
  Write-Info "install service: $serviceName"
  & $nssmExe install $serviceName $cmdPath | Out-Null
  & $nssmExe set $serviceName AppDirectory $workDir | Out-Null
  & $nssmExe set $serviceName Start SERVICE_AUTO_START | Out-Null
}

function Restart-ServiceSafe($serviceName) {
  $svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
  if (!$svc) { return }
  try {
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
  } catch {
  }
  Start-Service -Name $serviceName
}

Write-Info "appDir=$AppDir"
Write-Info "dataDir=$DataDir"
Ensure-Dir $DataDir
Set-MachineEnv 'AI_CBDES_DATA_DIR' $DataDir

$gitExe = Resolve-GitExe
$pythonExe = Resolve-PythonExe
$nodeExe = Resolve-NodeExe
$npmCmd = Resolve-NpmCmd

$venvDir = Join-Path $AppDir '.venv'
$venvPython = Ensure-PythonVenv $venvDir

Write-Info 'install python deps'
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r (Join-Path $AppDir 'backend\requirements.txt')

Ensure-NpmInstall $AppDir $NpmRegistry $NpmVerbose
Ensure-FrontendBuild $AppDir

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeDir = Join-Path $AppDir '.runtime'
$binDir = Join-Path $runtimeDir 'bin'
Ensure-Dir $binDir

$caddyExe = Install-CaddyIfMissing $binDir
$caddyfilePath = Join-Path $runtimeDir 'Caddyfile'
$siteRoot = Join-Path $AppDir 'dist'
Write-Caddyfile -path $caddyfilePath -siteRoot $siteRoot -fastApiPort $FastApiPort -expressPort $ExpressPort -httpPort $HttpPort -publicHost $PublicHost

$cmds = Write-StartCmds -binDir $binDir -venvPython $venvPython -appDir $AppDir -fastApiPort $FastApiPort -expressPort $ExpressPort -caddyExe $caddyExe -caddyfilePath $caddyfilePath

$nssmExe = Ensure-Nssm $binDir

Install-ServiceIfMissing $nssmExe 'ai-cbdes-fastapi' $cmds.FastApi $AppDir
Install-ServiceIfMissing $nssmExe 'ai-cbdes-express' $cmds.Express $AppDir
Install-ServiceIfMissing $nssmExe 'ai-cbdes-caddy' $cmds.Caddy $AppDir

Restart-ServiceSafe 'ai-cbdes-fastapi'
Restart-ServiceSafe 'ai-cbdes-express'
Restart-ServiceSafe 'ai-cbdes-caddy'

Write-Info 'health checks'
try {
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "http://127.0.0.1:$FastApiPort/health" | Out-Null
  Write-Info 'fastapi OK'
} catch {
  Write-Info 'fastapi health FAILED'
}

try {
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "http://127.0.0.1:$ExpressPort/api/health" | Out-Null
  Write-Info 'express OK'
} catch {
  Write-Info 'express health FAILED'
}

Write-Info "done. open: https://$PublicHost/"
