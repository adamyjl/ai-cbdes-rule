from __future__ import annotations

import shlex
import subprocess
import time
from pathlib import Path


_ALLOWED_PREFIXES = {
    'python',
    'py',
    'pytest',
    'npm',
    'pnpm',
    'ctest',
    'cmake',
    'ninja',
    'make',
    'bazel',
    'colcon',
}


def run_command(*, cwd: str, command: str, timeout_ms: int = 60000) -> dict:
    if not command or not command.strip():
        raise ValueError('empty_command')

    args = shlex.split(command, posix=False)
    if not args:
        raise ValueError('empty_command')

    head = str(args[0]).lower()
    if head not in _ALLOWED_PREFIXES:
        raise PermissionError('command_not_allowed')

    workdir = Path(cwd).resolve()
    if not workdir.exists() or not workdir.is_dir():
        raise FileNotFoundError('cwd_not_found')

    started = time.perf_counter()
    try:
        proc = subprocess.run(
            args,
            cwd=str(workdir),
            capture_output=True,
            text=True,
            timeout=max(1, int(timeout_ms)) / 1000.0,
            shell=False,
        )
        duration_ms = int((time.perf_counter() - started) * 1000)
        stdout = (proc.stdout or '')
        stderr = (proc.stderr or '')
        max_len = 20000
        if len(stdout) > max_len:
            stdout = stdout[:max_len] + '\n...<truncated>'
        if len(stderr) > max_len:
            stderr = stderr[:max_len] + '\n...<truncated>'
        return {
            'ok': proc.returncode == 0,
            'exit_code': int(proc.returncode),
            'duration_ms': duration_ms,
            'stdout': stdout,
            'stderr': stderr,
        }
    except subprocess.TimeoutExpired as e:
        duration_ms = int((time.perf_counter() - started) * 1000)
        out = (e.stdout or '') if isinstance(e.stdout, str) else ''
        err = (e.stderr or '') if isinstance(e.stderr, str) else ''
        return {
            'ok': False,
            'exit_code': -1,
            'duration_ms': duration_ms,
            'stdout': out,
            'stderr': (err + '\nTIMEOUT').strip(),
        }

