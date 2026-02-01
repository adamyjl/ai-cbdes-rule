$ErrorActionPreference = 'SilentlyContinue'

function Stop-ByPort($port) {
  $pids = @()
  try {
    $pids += Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
  } catch {
  }
  if (!$pids -or $pids.Count -eq 0) {
    try {
      $lines = netstat -ano -p TCP | Select-String (":$port") | ForEach-Object { $_.Line }
      foreach ($line in $lines) {
        if ($line -match "LISTENING\s+(\d+)$") {
          $pids += [int]$Matches[1]
        }
      }
    } catch {
    }
  }
  foreach ($p in ($pids | Sort-Object -Unique)) {
    try {
      Stop-Process -Id $p -Force
    } catch {
    }
  }
}

Stop-ByPort 8000
Stop-ByPort 3001
Stop-ByPort 5173

Get-Process -Name uvicorn -ErrorAction SilentlyContinue | Stop-Process -Force

try {
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match 'uvicorn' -and $_.CommandLine -match '8000' } |
    ForEach-Object {
      try { Stop-Process -Id $_.ProcessId -Force } catch { }
    }
} catch {
}

Write-Host 'Stopped local processes (best-effort).'
