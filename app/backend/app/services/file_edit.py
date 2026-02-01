from __future__ import annotations

from pathlib import Path


def replace_lines_in_file(*, file_path: str, start_line: int, end_line: int, new_text: str) -> dict:
    p = Path(file_path)
    if not p.exists() or not p.is_file():
        raise FileNotFoundError(file_path)

    if start_line < 1 or end_line < start_line:
        raise ValueError('invalid_line_range')

    old = p.read_text(encoding='utf-8', errors='replace')
    lines = old.splitlines(keepends=True)
    if end_line > len(lines):
        raise ValueError('line_range_out_of_bounds')

    nl = '\n'
    replacement = new_text
    if not replacement.endswith(nl):
        replacement += nl

    new_lines = replacement.splitlines(keepends=True)
    before = lines[: start_line - 1]
    after = lines[end_line:]
    merged = before + new_lines + after
    p.write_text(''.join(merged), encoding='utf-8')

    new_end_line = (start_line - 1) + len(new_lines)
    return {
        'file_path': str(p),
        'old_start_line': int(start_line),
        'old_end_line': int(end_line),
        'new_start_line': int(start_line),
        'new_end_line': int(new_end_line),
        'new_line_count': int(len(new_lines)),
    }


def ensure_under_root(*, root_dir: str, file_path: str) -> None:
    root = Path(root_dir).resolve()
    target = Path(file_path).resolve()
    if root == target:
        return
    if root not in target.parents:
        raise PermissionError('file_outside_root')

