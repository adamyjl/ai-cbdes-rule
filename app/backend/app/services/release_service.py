from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from backend.app.services.archive_service import ArchiveService
from backend.app.services.code_models import FunctionChunk
from backend.app.services.data_dir import get_data_dir
from backend.app.services.rag_store import RagStore
from backend.app.services.release_module_store import ReleaseModuleStore


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ReleaseService:
    def __post_init__(self) -> None:
        self._rag = RagStore()
        self._modules = ReleaseModuleStore()
        self._archive = ArchiveService()

    def rag_index(self, *, version: str, functions: list[dict]) -> dict:
        v = str(version).strip()
        if not v:
            return {'ok': False, 'error': 'missing_version'}

        root_dir = str((get_data_dir() / 'release_sources' / v).resolve())

        chunks: list[FunctionChunk] = []
        display_name_by_id: dict[str, str] = {}
        module_by_id: dict[str, str] = {}
        doc_zh_by_id: dict[str, str] = {}

        for fn in functions:
            name = str(fn.get('name') or '').strip()
            sig = str(fn.get('signature') or '').strip()
            code = str(fn.get('content') or '').strip()
            file_path = str(fn.get('file_path') or fn.get('path') or 'unknown.cpp').strip()
            comment = str(fn.get('comment') or '').strip()
            if not name or not sig or not code:
                continue
            fid = str(uuid4())
            rel = file_path.replace('\\', '/').lstrip('/')
            full_path = str(Path(root_dir) / rel)
            start_line = 1
            end_line = max(1, len(code.splitlines()))
            chunks.append(
                FunctionChunk(
                    function_id=fid,
                    language='cpp',
                    file_path=full_path,
                    start_line=start_line,
                    end_line=end_line,
                    name=name,
                    signature=sig,
                    code=code,
                )
            )
            display_name_by_id[fid] = name
            module_by_id[fid] = 'release'
            doc_zh_by_id[fid] = comment

        if not chunks:
            return {'ok': False, 'error': 'no_functions'}

        upserted = self._rag.upsert_functions(
            chunks,
            display_name_by_id=display_name_by_id,
            module_by_id=module_by_id,
            doc_zh_by_id=doc_zh_by_id,
        )

        self._archive.append_event(
            'release.rag_index',
            {
                'version': v,
                'root_dir': root_dir,
                'upserted': int(upserted),
                'function_ids': [c.function_id for c in chunks],
            },
        )

        items = []
        for c in chunks:
            items.append(
                {
                    'function_id': c.function_id,
                    'file_path': c.file_path,
                    'display_name': display_name_by_id.get(c.function_id, c.name),
                    'module': module_by_id.get(c.function_id, 'release'),
                    'doc_zh': doc_zh_by_id.get(c.function_id, ''),
                    'embedded': 0,
                }
            )

        return {'ok': True, 'version': v, 'root_dir': root_dir, 'upserted': int(upserted), 'items': items}

    def modules_upsert(self, *, version: str, functions: list[dict], namespace: str) -> dict:
        v = str(version).strip()
        ns = str(namespace).strip() or 'default'
        if not v:
            return {'ok': False, 'error': 'missing_version'}

        fn_by_name: dict[str, dict] = {}
        for fn in functions:
            name = str(fn.get('name') or '').strip()
            if not name:
                continue
            fn_by_name[name] = fn

        names = list(fn_by_name.keys())
        if not names:
            return {'ok': False, 'error': 'no_functions'}

        call_edges: dict[str, set[str]] = {n: set() for n in names}
        called_by: dict[str, set[str]] = {n: set() for n in names}
        for name, fn in fn_by_name.items():
            body = str(fn.get('content') or '')
            for callee in names:
                if callee == name:
                    continue
                if re.search(rf"\b{re.escape(callee)}\s*\(", body):
                    call_edges[name].add(callee)
                    called_by[callee].add(name)

        roots = [n for n in names if not called_by[n]]
        if not roots:
            roots = names[:1]

        def walk(root: str) -> tuple[list[str], list[tuple[str, str]]]:
            seen: set[str] = set()
            stack = [root]
            edges: set[tuple[str, str]] = set()
            while stack:
                cur = stack.pop()
                if cur in seen:
                    continue
                seen.add(cur)
                for nxt in call_edges.get(cur, set()):
                    edges.add((cur, nxt))
                    if nxt not in seen:
                        stack.append(nxt)
            return sorted(seen), sorted(edges)

        modules: list[dict] = []
        now = _utc_now_iso()
        for r in roots:
            funcs, edges = walk(r)
            module_key = f"{v}:{ns}:{r}"
            modules.append(
                {
                    'module_key': module_key,
                    'version': v,
                    'namespace': ns,
                    'root_function': r,
                    'functions': funcs,
                    'edges': [{'from': a, 'to': b} for a, b in edges],
                    'updated_at': now,
                }
            )

        upserted = self._modules.upsert_modules(modules)
        self._archive.append_event(
            'release.module_upsert',
            {
                'version': v,
                'namespace': ns,
                'upserted': int(upserted),
                'module_keys': [m['module_key'] for m in modules],
            },
        )
        return {'ok': True, 'version': v, 'namespace': ns, 'upserted': int(upserted), 'modules': modules}
