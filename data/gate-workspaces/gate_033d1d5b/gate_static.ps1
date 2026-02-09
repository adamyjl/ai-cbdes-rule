$ErrorActionPreference = 'Stop'

function Find-Command($name) {
  try { return (Get-Command $name -ErrorAction SilentlyContinue) } catch { return $null }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$cppcheck = Find-Command 'cppcheck'
if (!$cppcheck) {
  Write-Host '[static] cppcheck_not_found (skip)'
  exit 0
}

Write-Host '[static] running cppcheck'
& $cppcheck.Source --enable=all --inconclusive --std=c++17 --language=c++ .
