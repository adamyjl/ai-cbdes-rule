$ErrorActionPreference = 'Stop'

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

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$files = Get-ChildItem -Recurse -File -Include *.cpp,*.cc,*.cxx,*.c,*.hpp,*.h
if (!$files -or $files.Count -eq 0) {
  Write-Host '[compile] no_source_files'
  exit 1
}

$cmake = Find-Command 'cmake'
if ($cmake -and (Test-Path (Join-Path $root 'CMakeLists.txt'))) {
  Write-Host '[compile] using cmake'
  cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
  cmake --build build --config Release
  exit 0
}

$cl = Find-Command 'cl'
$gpp = Find-Command 'g++'
$clangpp = Find-Command 'clang++'

if (!$cl) {
  $ok = Import-VsDevEnv
  if ($ok) { $cl = Find-Command 'cl' }
}

$cpp = Get-ChildItem -Recurse -File -Include *.cpp,*.cc,*.cxx
if (!$cpp -or $cpp.Count -eq 0) {
  Write-Host '[compile] no_cpp_files (skip compile)'
  exit 0
}

New-Item -ItemType Directory -Force -Path (Join-Path $root 'build') | Out-Null

if ($cl) {
  Write-Host '[compile] using cl.exe'
  $objDir = Join-Path $root 'build\obj'
  New-Item -ItemType Directory -Force -Path $objDir | Out-Null
  foreach ($f in $cpp) {
    & $cl.Source /nologo /std:c++17 /W4 /EHsc /c /Fo:"$objDir\" $f.FullName
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  exit 0
}

if ($gpp) {
  Write-Host '[compile] using g++'
  $objDir = Join-Path $root 'build/obj'
  New-Item -ItemType Directory -Force -Path $objDir | Out-Null
  foreach ($f in $cpp) {
    $outObj = Join-Path $objDir ($f.BaseName + '.o')
    & $gpp.Source -std=c++17 -O2 -Wall -Wextra -Werror -c $f.FullName -o $outObj
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  exit 0
}

if ($clangpp) {
  Write-Host '[compile] using clang++'
  $objDir = Join-Path $root 'build/obj'
  New-Item -ItemType Directory -Force -Path $objDir | Out-Null
  foreach ($f in $cpp) {
    $outObj = Join-Path $objDir ($f.BaseName + '.o')
    & $clangpp.Source -std=c++17 -O2 -Wall -Wextra -Werror -c $f.FullName -o $outObj
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  exit 0
}

Write-Host '[compile] no_cpp_compiler_found'
exit 1
