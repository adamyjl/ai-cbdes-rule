from __future__ import annotations

import os
from pathlib import Path


def norm_path(p: str | Path) -> str:
    return str(Path(p).resolve())


def is_ignored_dir(dir_name: str) -> bool:
    name = dir_name.lower()
    return name in {
        '.git',
        '.hg',
        '.svn',
        '.venv',
        'venv',
        '__pycache__',
        'node_modules',
        'dist',
        'build',
        'out',
        '.idea',
        '.vscode',
        '.mypy_cache',
        '.pytest_cache',
    }


def iter_source_files(root_dir: str) -> list[str]:
    root = Path(root_dir)
    if not root.exists() or not root.is_dir():
        return []

    exts = {
        '.cpp',
        '.c',
        '.cc',
        '.cxx',
        '.h',
        '.hpp',
        '.hh',
        '.hxx',
        '.py',
        '.js',
        '.jsx',
        '.ts',
        '.tsx',
        '.java',
        '.cs',
    }
    out: list[str] = []
    for base, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not is_ignored_dir(d)]
        for f in filenames:
            ext = Path(f).suffix.lower()
            if ext in exts:
                out.append(str(Path(base) / f))
    return out
