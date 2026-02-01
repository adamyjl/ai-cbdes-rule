from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from backend.app.services.code_models import FunctionChunk
from backend.app.services.cpp_splitter import split_cpp_like_functions
from backend.app.services.path_utils import iter_source_files, norm_path
from backend.app.services.py_splitter import split_python_functions
from backend.app.services.function_filter import is_meaningful_function


@dataclass(frozen=True)
class ScanResult:
    root_dir: str
    files: int
    functions: int
    file_paths: list[str]
    chunks: list[FunctionChunk]


def _read_text_guess(path: str) -> str:
    p = Path(path)
    data = p.read_bytes()
    for enc in ('utf-8', 'utf-8-sig', 'gbk', 'cp936'):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode('utf-8', errors='ignore')


def scan_directory(
    root_dir: str,
    *,
    on_file: Callable[[int, int, str], None] | None = None,
) -> ScanResult:
    root = norm_path(root_dir)
    files = iter_source_files(root)
    chunks: list[FunctionChunk] = []

    total = len(files)
    for idx, fp in enumerate(files):
        if on_file:
            on_file(idx + 1, total, fp)
        ext = Path(fp).suffix.lower()
        try:
            source = _read_text_guess(fp)
        except OSError:
            continue
        if ext == '.py':
            chunks.extend(split_python_functions(fp, source))
        else:
            chunks.extend(split_cpp_like_functions(fp, source))

    chunks = [c for c in chunks if is_meaningful_function(c)]

    return ScanResult(
        root_dir=root,
        files=len(files),
        functions=len(chunks),
        file_paths=list(files),
        chunks=chunks,
    )
