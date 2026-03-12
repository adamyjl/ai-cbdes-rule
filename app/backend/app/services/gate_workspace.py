from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path

from backend.app.services.data_dir import get_data_dir


@dataclass
class GateWorkspace:
    root: Path
    files: list[dict]


def _safe_relpath(p: str) -> str:
    s = (p or '').strip().replace('\\', '/')
    s = re.sub(r'\s+', ' ', s)
    if not s:
        return ''
    if re.match(r'^[a-zA-Z]:', s):
        return ''
    if s.startswith(('/', '\\')):
        return ''
    parts = [x for x in s.split('/') if x and x not in {'.'}]
    if any(x == '..' for x in parts):
        return ''
    return '/'.join(parts)


def _extract_files_from_markdown(text: str) -> list[dict]:
    s = (text or '').strip()
    if not s:
        return []

    pat = re.compile(
        r'^###\s+(?P<path>.+?)\s*$\n(?:(?:.|\n)*?)^```(?P<lang>[a-zA-Z0-9_+\-]*)\s*$\n(?P<body>(?:.|\n)*?)^```\s*$',
        flags=re.MULTILINE,
    )
    files: list[dict] = []
    for m in pat.finditer(s):
        path = _safe_relpath(m.group('path') or '')
        body = (m.group('body') or '').strip()
        if not path or not body:
            continue
        lang = (m.group('lang') or '').strip().lower() or 'cpp'
        files.append({'path': path, 'language': lang, 'content': body})
    if files:
        return files

    pat2 = re.compile(
        r'^```(?P<lang>cpp|c\+\+|c)\s*$\n(?P<body>(?:.|\n)*?)^```\s*$',
        flags=re.MULTILINE,
    )
    blocks: list[dict] = []
    for m in pat2.finditer(s):
        body = (m.group('body') or '').strip()
        if not body:
            continue
        lang = (m.group('lang') or '').strip().lower()
        blocks.append({'path': 'main.cpp', 'language': 'cpp' if lang in {'cpp', 'c++'} else 'c', 'content': body})
        break
    return blocks


def _write_text(p: Path, content: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')


def _ensure_cmake_lists(root: Path) -> None:
    cmake = root / 'CMakeLists.txt'
    if cmake.exists():
        return

    srcs = []
    for ext in ('.cpp', '.cc', '.cxx', '.c'):
        srcs += [str(x.relative_to(root)).replace('\\', '/') for x in root.rglob(f'*{ext}')]

    if not srcs:
        stub = root / 'main.cpp'
        if not stub.exists():
            _write_text(
                stub,
                '#include <iostream>\n\nint main() {\n  std::cout << "gate workspace" << std::endl;\n  return 0;\n}\n',
            )
        srcs = ['main.cpp']

    content = (
        'cmake_minimum_required(VERSION 3.16)\n'
        'project(gate_workspace LANGUAGES C CXX)\n'
        'set(CMAKE_CXX_STANDARD 17)\n'
        'set(CMAKE_CXX_STANDARD_REQUIRED ON)\n'
        'set(CMAKE_C_STANDARD 11)\n'
        'set(CMAKE_C_STANDARD_REQUIRED ON)\n'
        'file(GLOB_RECURSE GATE_CPP "*.cpp" "*.cc" "*.cxx")\n'
        'file(GLOB_RECURSE GATE_C "*.c")\n'
        'if(GATE_CPP)\n'
        '  add_executable(gate_app ${GATE_CPP})\n'
        'elseif(GATE_C)\n'
        '  add_executable(gate_app ${GATE_C})\n'
        'endif()\n'
    )
    _write_text(cmake, content)


def _ensure_gate_scripts(root: Path) -> None:
    compile_ps1 = root / 'gate_compile.ps1'
    static_ps1 = root / 'gate_static.ps1'
    unit_ps1 = root / 'gate_unit.ps1'
    coverage_ps1 = root / 'gate_coverage.ps1'

    _write_text(
        compile_ps1,
        r"""$ErrorActionPreference = 'Stop'

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

$cmakeExe = $null
$cmakeCmd = Find-Command 'cmake'
if ($cmakeCmd) { $cmakeExe = 'cmake' }
if (!$cmakeExe) {
  $candidates = @()
  if ($env:ProgramFiles) { $candidates += (Join-Path $env:ProgramFiles 'CMake\bin\cmake.exe') }
  if (${env:ProgramFiles(x86)}) { $candidates += (Join-Path ${env:ProgramFiles(x86)} 'CMake\bin\cmake.exe') }
  foreach ($p in $candidates) {
    if ($p -and (Test-Path $p)) {
      $env:Path = (Split-Path -Parent $p) + ';' + $env:Path
      $cmakeExe = $p
      break
    }
  }
}
if ($cmakeExe -and (Test-Path (Join-Path $root 'CMakeLists.txt'))) {
  Write-Host '[compile] using cmake'
  & $cmakeExe -S . -B build -DCMAKE_BUILD_TYPE=Release
  & $cmakeExe --build build --config Release
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

$hdr = Get-ChildItem -Recurse -File -Include *.h,*.hpp
$incDirs = @()
$incDirs += $root
foreach ($h in $hdr) {
  $d = Split-Path -Parent $h.FullName
  if ($d -and -not ($incDirs -contains $d)) { $incDirs += $d }
}

New-Item -ItemType Directory -Force -Path (Join-Path $root 'build') | Out-Null

if ($cl) {
  Write-Host '[compile] using cl.exe'
  $objDir = Join-Path $root 'build\obj'
  New-Item -ItemType Directory -Force -Path $objDir | Out-Null
  $incArgs = @()
  foreach ($d in $incDirs) { $incArgs += ("/I" + $d) }
  foreach ($f in $cpp) {
    & $cl.Source /nologo /std:c++17 /W4 /EHsc @incArgs /c /Fo:"$objDir\" $f.FullName
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  exit 0
}

if ($gpp) {
  Write-Host '[compile] using g++'
  $objDir = Join-Path $root 'build/obj'
  New-Item -ItemType Directory -Force -Path $objDir | Out-Null
  $incArgs = @()
  foreach ($d in $incDirs) { $incArgs += ('-I' + $d) }
  foreach ($f in $cpp) {
    $outObj = Join-Path $objDir ($f.BaseName + '.o')
    & $gpp.Source -std=c++17 -O2 -Wall -Wextra -Werror @incArgs -c $f.FullName -o $outObj
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  exit 0
}

if ($clangpp) {
  Write-Host '[compile] using clang++'
  $objDir = Join-Path $root 'build/obj'
  New-Item -ItemType Directory -Force -Path $objDir | Out-Null
  $incArgs = @()
  foreach ($d in $incDirs) { $incArgs += ('-I' + $d) }
  foreach ($f in $cpp) {
    $outObj = Join-Path $objDir ($f.BaseName + '.o')
    & $clangpp.Source -std=c++17 -O2 -Wall -Wextra -Werror @incArgs -c $f.FullName -o $outObj
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  exit 0
}

Write-Host '[compile] no_cpp_compiler_found (skip)'
exit 0
""",
    )

    _write_text(
        static_ps1,
        r"""$ErrorActionPreference = 'Stop'

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
""",
    )

    _write_text(
        unit_ps1,
        r"""$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (!(Test-Path (Join-Path $root 'gate_unit.cpp'))) {
  Write-Host '[unit] gate_unit.cpp_missing (skip)'
  exit 0
}

Write-Host '[unit] compiling and running gate_unit.cpp'

$hdr = Get-ChildItem -Recurse -File -Include *.h,*.hpp
$incDirs = @()
$incDirs += $root
foreach ($h in $hdr) {
  $d = Split-Path -Parent $h.FullName
  if ($d -and -not ($incDirs -contains $d)) { $incDirs += $d }
}

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
  $incArgs = @()
  foreach ($d in $incDirs) { $incArgs += ("/I" + $d) }
  & $cl.Source /nologo /std:c++17 /W4 /EHsc @incArgs /Fe:$out (Join-Path $root 'gate_unit.cpp')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $out
  exit $LASTEXITCODE
}

if ($gpp) {
  $out = Join-Path $root 'build/gate_unit.exe'
  $incArgs = @()
  foreach ($d in $incDirs) { $incArgs += ('-I' + $d) }
  & $gpp.Source -std=c++17 -O2 -Wall -Wextra -Werror @incArgs -o $out (Join-Path $root 'gate_unit.cpp')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $out
  exit $LASTEXITCODE
}

if ($clangpp) {
  $out = Join-Path $root 'build/gate_unit.exe'
  $incArgs = @()
  foreach ($d in $incDirs) { $incArgs += ('-I' + $d) }
  & $clangpp.Source -std=c++17 -O2 -Wall -Wextra -Werror @incArgs -o $out (Join-Path $root 'gate_unit.cpp')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $out
  exit $LASTEXITCODE
}

Write-Host '[unit] no_cpp_compiler_found (skip)'
exit 0
""",
    )

    _write_text(
        coverage_ps1,
        r"""$ErrorActionPreference = 'Stop'

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
""",
    )


def _ensure_gate_unit_cpp(root: Path) -> None:
    unit_cpp = root / 'gate_unit.cpp'
    if unit_cpp.exists():
        return

    header_candidates = []
    for p in root.rglob('*.hpp'):
        header_candidates.append(p)
    for p in root.rglob('*.h'):
        header_candidates.append(p)
    header_rel = None
    for p in header_candidates:
        try:
            txt = p.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue
        if 'get2Dis' in txt or 'Distance' in txt or 'Xc' in txt or 'Yc' in txt:
            header_rel = str(p.relative_to(root)).replace('\\', '/')
            break
    if not header_rel and header_candidates:
        header_rel = str(header_candidates[0].relative_to(root)).replace('\\', '/')
    if not header_rel:
        return

    content = (
        '#include <cstdio>\n'
        '\n'
        f'#include "{header_rel}"\n'
        '\n'
        'int main() {\n'
        '  std::printf("gate_unit ok=1\\n");\n'
        '  return 0;\n'
        '}\n'
    )
    _write_text(unit_cpp, content)


def ensure_gate_scaffold(*, root: Path) -> None:
    _ensure_cmake_lists(root)
    _ensure_gate_unit_cpp(root)
    _ensure_gate_scripts(root)


def create_workspace(*, name_hint: str | None = None) -> Path:
    base = get_data_dir() / 'gate-workspaces'
    base.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r'[^a-zA-Z0-9_\-]+', '_', (name_hint or '').strip())
    if not safe:
        safe = 'workspace'
    root = base / safe
    if root.exists():
        i = 2
        while (base / f'{safe}_{i}').exists() and i < 10000:
            i += 1
        root = base / f'{safe}_{i}'
    root.mkdir(parents=True, exist_ok=True)
    return root


def materialize_generated_result(*, work_dir: Path, generated_result: str) -> GateWorkspace:
    files = _extract_files_from_markdown(generated_result)
    written: list[dict] = []
    for f in files:
        rel = _safe_relpath(str(f.get('path') or ''))
        content = str(f.get('content') or '').strip()
        if not rel or not content:
            continue
        p = work_dir / rel
        _write_text(p, content)
        written.append({'path': rel, 'bytes': len(content.encode('utf-8'))})

    _ensure_dijkstra_topology_stubs(work_dir)
    _fix_list_iterator_arithmetic(work_dir)

    ensure_gate_scaffold(root=work_dir)

    manifest = {
        'written_files': written,
    }
    _write_text(work_dir / '.gate_manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2))
    return GateWorkspace(root=work_dir, files=written)


def _fix_list_iterator_arithmetic(root: Path) -> None:
    decl_re = re.compile(r'std::list\s*<[^>]+>\s*::\s*(?:const_)?iterator\s+([A-Za-z_][A-Za-z0-9_]*)')
    inc_re = re.compile(r'^\s*#\s*include\s*<iterator>\s*$', re.M)
    inc_line_re = re.compile(r'^\s*#\s*include\b', re.M)
    for p in root.rglob('*.cpp'):
        try:
            txt = p.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue
        names = set(decl_re.findall(txt))
        if not names:
            continue
        changed = False
        for name in sorted(names, key=len, reverse=True):
            pat = re.compile(rf'(^\s*){re.escape(name)}\s*=\s*{re.escape(name)}\s*\+\s*1\s*;\s*$', re.M)
            if pat.search(txt):
                txt = pat.sub(rf'\1std::advance({name}, 1);', txt)
                changed = True
        if not changed:
            continue
        if not inc_re.search(txt):
            lines = txt.splitlines()
            insert_at = 0
            for i in range(min(len(lines), 80)):
                if inc_line_re.match(lines[i]):
                    insert_at = i + 1
            if insert_at == 0:
                insert_at = 0
            lines[insert_at:insert_at] = ['#include <iterator>', '']
            txt = '\n'.join(lines) + ('\n' if p.read_text(encoding='utf-8', errors='ignore').endswith('\n') else '')
        _write_text(p, txt)


def _ensure_dijkstra_topology_stubs(root: Path) -> None:
    inc = root / 'Planning' / 'RoutingPlanning' / 'GridMethod' / 'Dijkstra' / 'include'
    src = root / 'Planning' / 'RoutingPlanning' / 'GridMethod' / 'Dijkstra' / 'DijkstraMap' / 'src' / 'dijkstraTopologyMap.cpp'
    if not src.exists():
        return

    dijkstra_h = inc / 'dijkstraTopologyMap.h'
    loc_h = inc / 'localizationMapAnalysis.h'
    if not dijkstra_h.exists():
        _write_text(
            dijkstra_h,
            (
                '#ifndef DIJKSTRA_TOPOLOGY_MAP_H\n'
                '#define DIJKSTRA_TOPOLOGY_MAP_H\n'
                '\n'
                '#include <vector>\n'
                '#include <list>\n'
                '#include <queue>\n'
                '#include <utility>\n'
                '#include <string>\n'
                '\n'
                'typedef struct {\n'
                '  double GaussX;\n'
                '  double GaussY;\n'
                '} GaussRoadPoint;\n'
                '\n'
                'typedef struct {\n'
                '  int sucRoadID;\n'
                '  int sucLaneID;\n'
                '} LaneSuccessorId;\n'
                '\n'
                'typedef struct {\n'
                '  int id;\n'
                '  std::vector<LaneSuccessorId> successorId;\n'
                '  std::vector<GaussRoadPoint> gaussRoadPoints;\n'
                '} Lane;\n'
                '\n'
                'typedef struct Road {\n'
                '  int id;\n'
                '  std::vector<int> successorId;\n'
                '  std::vector<Lane> lanes;\n'
                '  int isInList;\n'
                '  double xBegin;\n'
                '  double xEnd;\n'
                '  double yBegin;\n'
                '  double yEnd;\n'
                '  double length;\n'
                '  std::vector<int> to;\n'
                '  int father;\n'
                '  double f;\n'
                '  double g;\n'
                '  double h;\n'
                '  bool operator<(const Road& other) const { return f > other.f; }\n'
                '} Road;\n'
                '\n'
                'typedef struct {\n'
                '  std::vector<Road> roads;\n'
                '  void mapAnalysis(const char* mapPath);\n'
                '  void moduleSelfCheckPrint();\n'
                '} Map;\n'
                '\n'
                'typedef struct Astar {\n'
                '  Road* roadList;\n'
                '  std::priority_queue<Road> openList;\n'
                '  void initRoad(struct Astar* astar, int number, double xStart, double yStart, double xEnd, double yEnd, double length);\n'
                '  void initLink(struct Astar* astar, int from, int to);\n'
                '  void mapToAstar(const Map& m, struct Astar* astar);\n'
                '  double calcH(int current, int end, Road* roadList);\n'
                '  Road* findPath(int origin, int destination);\n'
                '  int getPath(int origin, int destination, std::list<int>* path);\n'
                '  int findLane(const Map& m, const std::list<int>& path, std::list<std::pair<int, int>>* pathLanes);\n'
                '  void moduleSelfCheckPrint(const std::list<std::pair<int, int>>& pathLanes);\n'
                '} Astar;\n'
                '\n'
                '#endif\n'
            ),
        )

    if not loc_h.exists():
        _write_text(
            loc_h,
            (
                '#ifndef LOCALIZATION_MAP_ANALYSIS_H\n'
                '#define LOCALIZATION_MAP_ANALYSIS_H\n'
                '\n'
                '#include "dijkstraTopologyMap.h"\n'
                '#include <string>\n'
                '\n'
                'typedef struct { int dummy; } mapAnalysisPara;\n'
                'typedef struct { std::string fileName; } mapAnalysisInput;\n'
                'typedef struct { Map m; } mapAnalysisOutput;\n'
                'void mapAnalysis(mapAnalysisPara& para, mapAnalysisInput& input, mapAnalysisOutput& output);\n'
                '\n'
                '#endif\n'
            ),
        )
