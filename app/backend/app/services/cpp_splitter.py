from __future__ import annotations

import re
from pathlib import Path

from backend.app.services.code_models import FunctionChunk


_control_keywords = {
    'if',
    'for',
    'while',
    'switch',
    'catch',
}


def _strip_comments_keep_len(s: str) -> str:
    out = []
    i = 0
    n = len(s)
    in_str: str | None = None
    in_char = False
    while i < n:
        ch = s[i]
        nxt = s[i + 1] if i + 1 < n else ''
        if in_str:
            if ch == '\\':
                out.append(' ')
                if i + 1 < n:
                    out.append(' ')
                    i += 2
                    continue
            if ch == in_str:
                in_str = None
            out.append(' ')
            i += 1
            continue
        if in_char:
            if ch == '\\':
                out.append(' ')
                if i + 1 < n:
                    out.append(' ')
                    i += 2
                    continue
            if ch == "'":
                in_char = False
            out.append(' ')
            i += 1
            continue

        if ch == '"':
            in_str = '"'
            out.append(' ')
            i += 1
            continue
        if ch == "'":
            in_char = True
            out.append(' ')
            i += 1
            continue

        if ch == '/' and nxt == '/':
            while i < n and s[i] != '\n':
                out.append(' ')
                i += 1
            continue
        if ch == '/' and nxt == '*':
            out.append(' ')
            out.append(' ')
            i += 2
            while i < n - 1:
                if s[i] == '*' and s[i + 1] == '/':
                    out.append(' ')
                    out.append(' ')
                    i += 2
                    break
                out.append(' ' if s[i] != '\n' else '\n')
                i += 1
            continue

        out.append(ch)
        i += 1
    return ''.join(out)


def _find_function_name(signature: str) -> str:
    m = re.search(r"([~\w:]+)\s*\(", signature)
    if not m:
        return 'anonymous'
    return m.group(1).split('::')[-1]


def split_cpp_like_functions(file_path: str, source: str) -> list[FunctionChunk]:
    rel = str(Path(file_path))
    lines = source.splitlines()
    scrub = _strip_comments_keep_len(source)
    scrub_lines = scrub.splitlines()

    chunks: list[FunctionChunk] = []
    i = 0
    while i < len(scrub_lines):
        line = scrub_lines[i].strip()
        if not line or line.startswith('#'):
            i += 1
            continue
        if '(' not in line:
            i += 1
            continue

        sig_start = i
        sig_lines = [scrub_lines[i]]
        j = i
        open_paren = sig_lines[0].count('(') - sig_lines[0].count(')')
        while open_paren > 0 and j + 1 < len(scrub_lines):
            j += 1
            sig_lines.append(scrub_lines[j])
            open_paren += scrub_lines[j].count('(') - scrub_lines[j].count(')')

        sig_text = ' '.join(s.strip() for s in sig_lines)
        head = sig_text.strip()
        head_low = head.lower()
        if any(head_low.startswith(k + ' ') or head_low.startswith(k + '(') for k in _control_keywords):
            i += 1
            continue
        if ';' in head:
            i += 1
            continue

        brace_line = j
        brace_pos = scrub_lines[brace_line].find('{')
        if brace_pos == -1 and brace_line + 1 < len(scrub_lines) and scrub_lines[brace_line + 1].strip().startswith('{'):
            brace_line = brace_line + 1
            brace_pos = scrub_lines[brace_line].find('{')

        if brace_pos == -1:
            i += 1
            continue

        signature_raw = ' '.join(lines[k].strip() for k in range(sig_start, brace_line + 1))
        name = _find_function_name(signature_raw)

        start_line = sig_start + 1
        brace_count = 0
        end_line = brace_line
        k = brace_line
        while k < len(scrub_lines):
            for ch in scrub_lines[k]:
                if ch == '{':
                    brace_count += 1
                elif ch == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_line = k
                        break
            if brace_count == 0:
                break
            k += 1

        if brace_count != 0:
            i += 1
            continue

        code = '\n'.join(lines[start_line - 1 : end_line + 1])
        function_id = f"cpp::{rel}::{name}::{start_line}-{end_line + 1}"
        chunks.append(
            FunctionChunk(
                function_id=function_id,
                language='cpp',
                file_path=rel,
                start_line=start_line,
                end_line=end_line + 1,
                name=name,
                signature=signature_raw,
                code=code,
            )
        )

        i = end_line + 1
    return chunks

