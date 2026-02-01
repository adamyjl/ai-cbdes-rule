$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Find-Command($name) {
  try { return (Get-Command $name -ErrorAction SilentlyContinue) } catch { return $null }
}

$gcov = Find-Command 'gcov'
if (!$gcov) {
  Write-Host '[coverage] gcov_not_found (skip)'
  exit 0
}

Write-Host '[coverage] gcov available (no automatic wiring), skip'
exit 0
