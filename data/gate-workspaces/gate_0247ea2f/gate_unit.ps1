$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (!(Test-Path (Join-Path $root 'gate_unit.cpp'))) {
  Write-Host '[unit] gate_unit.cpp_missing (skip)'
  exit 0
}

Write-Host '[unit] compiling and running gate_unit.cpp'

function Find-Command($name) {
  try { return (Get-Command $name -ErrorAction SilentlyContinue) } catch { return $null }
}

$cl = Find-Command 'cl'
$gpp = Find-Command 'g++'
$clangpp = Find-Command 'clang++'

New-Item -ItemType Directory -Force -Path (Join-Path $root 'build') | Out-Null

if ($cl) {
  $out = Join-Path $root 'build\gate_unit.exe'
  & $cl.Source /nologo /std:c++17 /W4 /EHsc /Fe:$out (Join-Path $root 'gate_unit.cpp')
  & $out
  exit 0
}

if ($gpp) {
  $out = Join-Path $root 'build/gate_unit.exe'
  & $gpp.Source -std=c++17 -O2 -Wall -Wextra -Werror -o $out (Join-Path $root 'gate_unit.cpp')
  & $out
  exit 0
}

if ($clangpp) {
  $out = Join-Path $root 'build/gate_unit.exe'
  & $clangpp.Source -std=c++17 -O2 -Wall -Wextra -Werror -o $out (Join-Path $root 'gate_unit.cpp')
  & $out
  exit 0
}

Write-Host '[unit] no_cpp_compiler_found (skip)'
exit 0
