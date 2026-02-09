param(
  [Parameter(Mandatory = $true)][string]$SourceEventId
)

$ErrorActionPreference = 'Stop'

$archive = 'C:\srv\ai-cbdes-rule\data\archive.jsonl'
$pattern = '"id": "' + $SourceEventId + '"'
$m = Select-String -Path $archive -Pattern $pattern -SimpleMatch | Select-Object -First 1
if (!$m) {
  Write-Output ('NOT_FOUND source_event_id=' + $SourceEventId)
  exit 2
}

$obj = $m.Line | ConvertFrom-Json
$prompt = [string]$obj.payload.prompt

$code = [string]$obj.payload.code
if (-not $code) {
  Write-Output ('NO_CODE source_event_id=' + $SourceEventId)
  exit 3
}

$re = [regex]'(?ms)^###\s+(.+?)\s*$\r?\n```(?:cpp|c\+\+|c)\s*\r?\n(.*?)\r?\n```\s*$'
$ms = $re.Matches($code)
$paths = @()
foreach ($x in $ms) { $paths += (($x.Groups[1].Value.Trim()) -replace '\\', '/') }
$set = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($p in $paths) { [void]$set.Add($p) }

$incRe = [regex]'(?m)^\s*#\s*include\s*"([^"]+)"'
$missing = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($x in $ms) {
  $fpath = (($x.Groups[1].Value.Trim()) -replace '\\', '/')
  $body = $x.Groups[2].Value
  $base = ($fpath -split '/' | Select-Object -SkipLast 1) -join '/'
  foreach ($im in $incRe.Matches($body)) {
    $inc = (($im.Groups[1].Value.Trim()) -replace '\\', '/')
    if ($inc -match '^[A-Za-z]:' -or $inc.StartsWith('/')) { continue }
    $full = if ($base) { "$base/$inc" } else { $inc }
    $parts = @()
    foreach ($part in ($full -split '/')) {
      if ($part -eq '' -or $part -eq '.') { continue }
      elseif ($part -eq '..') { if ($parts.Count -gt 0) { $parts = $parts[0..($parts.Count - 2)] } }
      else { $parts += $part }
    }
    $norm = ($parts -join '/')
    if (-not $set.Contains($norm)) { [void]$missing.Add($norm) }
  }
}

Write-Output ("GEN_OK files=$($ms.Count) missing_includes=$($missing.Count)")
if ($missing.Count -gt 0) {
  $missing | Select-Object -First 5 | ForEach-Object { Write-Output ("MISS $_") }
}

$gateBody = @{ work_dir = 'AUTO'; compile_command = 'AUTO'; static_command = 'AUTO'; enable_unit = $true; enable_coverage = $true; requirement_prompt = $prompt; generated_result = $code; source_event_id = $SourceEventId; source_event_type = 'orchestrator.generate.repair' } | ConvertTo-Json -Depth 10 -Compress
$gateBytes = [Text.Encoding]::UTF8.GetBytes($gateBody)
$start = Invoke-RestMethod -Method Post -Uri https://www.ai-cbdes-rule.com/py/gate/start -ContentType 'application/json; charset=utf-8' -Body $gateBytes -TimeoutSec 60
if (-not $start.ok) {
  Write-Output ('GATE_START_FAIL ' + $start.error)
  exit 4
}

$jobId = [string]$start.job_id
Write-Output ('GATE_JOB ' + $jobId)

for ($i = 0; $i -lt 150; $i++) {
  Start-Sleep -Seconds 2
  $j = Invoke-RestMethod -Method Get -Uri ("https://www.ai-cbdes-rule.com/py/gate/jobs/$jobId") -TimeoutSec 30
  if ($j.done) {
    Write-Output ('GATE_DONE stage=' + $j.stage + ' error=' + $j.error)
    if ($j.stage -ne 'success') {
      $j.log_lines | Select-Object -Last 30 | ForEach-Object { Write-Output ("LOG $_") }
      exit 5
    }
    exit 0
  }
}

Write-Output 'GATE_TIMEOUT'
exit 6
