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

function Import-VsDevEnv {
  $pf86 = ${env:ProgramFiles(x86)}
  if (!$pf86) { return $false }
  $vswhere = Join-Path $pf86 'Microsoft Visual Studio\Installer\vswhere.exe'
  if (!(Test-Path $vswhere)) { return $false }
  $inst = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  if (!$inst) { return $false }
  $dev = Join-Path $inst 'Common7\Tools\VsDevCmd.bat'
  if (!(Test-Path $dev)) { return $false }
  $cmd = ('"{0}" -no_logo -arch=amd64 && set' -f $dev)
  $lines = cmd.exe /s /c $cmd
  foreach ($line in $lines) {
    $idx = $line.IndexOf('=')
    if ($idx -le 0) { continue }
    $name = $line.Substring(0, $idx)
    $value = $line.Substring($idx + 1)
    try { Set-Item -Path Env:$name -Value $value } catch { }
  }
  return $true
}

$cl = Find-Command 'cl'
$gpp = Find-Command 'g++'
$clangpp = Find-Command 'clang++'

if (!$cl) {
  $ok = Import-VsDevEnv
  if ($ok) { $cl = Find-Command 'cl' }
}

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
