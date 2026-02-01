from __future__ import annotations

import os
import re

from backend.app.services.code_models import FunctionChunk


def _env_flag(name: str, default: bool) -> bool:
    v = os.environ.get(name)
    if v is None:
        return default
    return str(v).strip().lower() not in {'0', 'false', 'no'}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except Exception:
        return default


def _strip_cpp_comments(s: str) -> str:
    s = re.sub(r'/\*[\s\S]*?\*/', '', s)
    s = re.sub(r'//.*', '', s)
    return s


def _cpp_is_ctor_or_dtor(signature: str) -> bool:
    m = re.search(r'([~\w:]+)\s*\(', signature)
    if not m:
        return False
    qual = m.group(1)
    parts = [p for p in qual.split('::') if p]
    if not parts:
        return False
    last = parts[-1]
    prev = parts[-2] if len(parts) >= 2 else ''
    if last.startswith('~'):
        return True
    if prev and last == prev:
        return True
    return False


def _cpp_is_trivial_get_set(code: str, *, max_body_lines: int) -> bool:
    s = _strip_cpp_comments(code)
    a = s.find('{')
    b = s.rfind('}')
    if a == -1 or b == -1 or b <= a:
        return False
    body = s[a + 1 : b]
    lines = [ln.strip() for ln in body.splitlines()]
    lines = [ln for ln in lines if ln and ln not in {'{', '}'}]
    if not lines:
        return True

    if len(lines) > max(1, int(max_body_lines)):
        return False

    joined = ' '.join(lines)
    low = joined.lower()
    if any(k in low for k in (' if ', 'for', 'while', 'switch', 'catch', 'throw', 'goto', ' new ', ' delete ')):
        return False

    if '(' in joined or ')' in joined:
        return False

    if re.fullmatch(r'return\s+[~\w\-\>\.\[\]]+\s*;?', joined):
        return True

    if re.fullmatch(r'[~\w\-\>\.\[\]]+\s*=\s*[~\w\-\>\.\[\]]+\s*;?', joined):
        return True

    return False


def _py_is_ctor_or_dtor(name: str) -> bool:
    return name.endswith('.__init__') or name.endswith('.__del__') or name in {'__init__', '__del__'}


def _py_is_trivial_get_set(code: str, *, max_body_lines: int) -> bool:
    lines = code.splitlines()
    if len(lines) <= 1:
        return True
    body = [ln.strip() for ln in lines[1:]]
    body = [ln for ln in body if ln and ln not in {'pass', '...'}]
    if not body:
        return True
    if len(body) > max(1, int(max_body_lines)):
        return False
    joined = ' '.join(body)
    if re.fullmatch(r'return\s+self\.[A-Za-z_]\w*', joined):
        return True
    if re.fullmatch(r'self\.[A-Za-z_]\w*\s*=\s*[A-Za-z_]\w*', joined):
        return True
    return False


def is_meaningful_function(chunk: FunctionChunk) -> bool:
    if not _env_flag('AI_CBDES_FILTER_TRIVIAL_FUNCTIONS', True):
        return True

    max_body_lines = _env_int('AI_CBDES_TRIVIAL_MAX_BODY_LINES', 1)
    max_body_lines = max(1, min(max_body_lines, 5))

    lang = (chunk.language or '').lower()
    name = chunk.name or ''
    signature = chunk.signature or ''
    code = chunk.code or ''

    if lang in {'cpp', 'c', 'cxx', 'cc', 'h', 'hpp'}:
        if _cpp_is_ctor_or_dtor(signature):
            return False
        if _cpp_is_trivial_get_set(code, max_body_lines=max_body_lines):
            return False
        return True

    if lang in {'python', 'py'}:
        if _py_is_ctor_or_dtor(name):
            return False
        if _py_is_trivial_get_set(code, max_body_lines=max_body_lines):
            return False
        return True

    return True

