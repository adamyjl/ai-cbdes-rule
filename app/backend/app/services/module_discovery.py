from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path

from backend.app.services.code_models import FunctionChunk


_CPP_KEYWORDS = {
    'if',
    'for',
    'while',
    'switch',
    'catch',
    'return',
    'sizeof',
    'new',
    'delete',
}


def _strip_cpp_comments(s: str) -> str:
    s = re.sub(r'/\*[\s\S]*?\*/', '', s)
    s = re.sub(r'//.*', '', s)
    return s


def _extract_call_symbols(code: str) -> list[str]:
    s = _strip_cpp_comments(code)
    out: list[str] = []
    for m in re.finditer(r'\b([A-Za-z_]\w*(?:::\w+)*)\s*\(', s):
        sym = m.group(1)
        if not sym:
            continue
        if sym in _CPP_KEYWORDS:
            continue
        out.append(sym)
    return out


def _signature_symbol(signature: str) -> str:
    m = re.search(r'([~\w:]+)\s*\(', signature or '')
    if not m:
        return ''
    qual = m.group(1)
    parts = [p for p in qual.split('::') if p]
    return parts[-1] if parts else qual


def _slug(s: str) -> str:
    s = (s or '').strip().lower()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    s = re.sub(r'_+', '_', s).strip('_')
    return s


def _stable_short_hash(text: str) -> str:
    h = hashlib.sha1(text.encode('utf-8', errors='ignore')).hexdigest()
    return h[:8]


@dataclass(frozen=True)
class ModuleCandidate:
    module_key: str
    root_dir: str
    entry_function_id: str
    entry_signature: str
    called_function_ids: list[str]
    edges: list[dict]


def discover_module_candidates(
    *,
    root_dir: str,
    chunks: list[FunctionChunk],
    symbol_to_function_id: dict[str, str],
    min_called_functions: int = 3,
) -> list[ModuleCandidate]:
    root = str(Path(root_dir).resolve())
    out: list[ModuleCandidate] = []

    for c in chunks:
        if str(Path(c.file_path).resolve()).startswith(root) is False:
            continue

        calls = _extract_call_symbols(c.code or '')
        ids: list[str] = []
        seen: set[str] = set()
        for sym in calls:
            fid = symbol_to_function_id.get(sym)
            if not fid:
                continue
            if fid == c.function_id:
                continue
            if fid in seen:
                continue
            seen.add(fid)
            ids.append(fid)

        if len(ids) < int(min_called_functions):
            continue

        base = _slug(_signature_symbol(c.signature) or c.name or '')
        if not base:
            base = 'module'
        module_key = base

        edges = [{'from': c.function_id, 'to': fid} for fid in ids]
        payload = json.dumps({'entry': c.function_id, 'calls': ids}, ensure_ascii=False)
        module_key = f"{module_key}_{_stable_short_hash(payload)}"

        out.append(
            ModuleCandidate(
                module_key=module_key,
                root_dir=root,
                entry_function_id=c.function_id,
                entry_signature=c.signature,
                called_function_ids=ids,
                edges=edges,
            )
        )

    return out

