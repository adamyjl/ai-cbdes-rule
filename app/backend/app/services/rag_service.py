from __future__ import annotations

from dataclasses import dataclass
import json
import threading
from uuid import uuid4

from fastapi import HTTPException

from backend.app.schemas import RagQueryHit
from backend.app.services.archive_service import ArchiveService
from backend.app.services.code_scanner import scan_directory
from backend.app.services.defaults import get_default_rag_root
from backend.app.services.file_edit import ensure_under_root, replace_lines_in_file
from backend.app.services.rag_embedder import embed_texts, pack_embedding
from backend.app.services.rag_enricher import enrich_function
from backend.app.services.rag_store import RagStore
from backend.app.services.test_runner import run_command
from backend.app.services.rag_index_jobs import registry as index_job_registry
from backend.app.services.rag_doc_jobs import registry as doc_job_registry
from backend.app.services.rag_kind_jobs import registry as kind_job_registry
from backend.app.services.module_index_jobs import registry as module_job_registry
from backend.app.services.module_discovery import discover_module_candidates
from backend.app.services.module_enricher import enrich_module
from backend.app.services.rag_enricher import classify_function_kind
from pathlib import Path


@dataclass
class RagService:
    def __post_init__(self) -> None:
        self._store = RagStore()
        self._archive = ArchiveService()

    def scan(self, root_dir: str, *, max_preview: int = 0) -> dict:
        res = scan_directory(root_dir)
        self._archive.append_event(
            'rag.scan',
            {
                'root_dir': res.root_dir,
                'files': res.files,
                'functions': res.functions,
            },
        )
        payload: dict = {
            'root_dir': res.root_dir,
            'scanned': True,
            'files': res.files,
            'functions': res.functions,
        }
        if max_preview and max_preview > 0:
            payload['preview'] = [
                {
                    'function_id': c.function_id,
                    'name': c.name,
                    'file_path': c.file_path,
                    'start_line': c.start_line,
                    'end_line': c.end_line,
                    'signature': c.signature,
                }
                for c in res.chunks[: max_preview]
            ]
        return payload

    def index(self, root_dir: str, *, enrich: bool = True, max_functions: int | None = None) -> dict:
        res = scan_directory(root_dir)
        chunks = res.chunks
        if max_functions is not None:
            chunks = chunks[: max(0, int(max_functions))]

        display_name_by_id: dict[str, str] = {}
        module_by_id: dict[str, str] = {}
        module_source_by_id: dict[str, str] = {}
        kind_by_id: dict[str, str] = {}
        kind_source_by_id: dict[str, str] = {}
        doc_zh_by_id: dict[str, str] = {}
        doc_en_by_id: dict[str, str] = {}
        inputs_json_by_id: dict[str, str] = {}
        outputs_json_by_id: dict[str, str] = {}

        if enrich:
            try:
                for c in chunks:
                    enriched = enrich_function(file_path=c.file_path, signature=c.signature, code=c.code)
                    display_name_by_id[c.function_id] = enriched['display_name']
                    module_by_id[c.function_id] = enriched['module']
                    module_source_by_id[c.function_id] = 'llm'
                    kind_by_id[c.function_id] = enriched.get('kind') or 'glue'
                    kind_source_by_id[c.function_id] = 'llm'
                    doc_zh_by_id[c.function_id] = enriched['doc_zh']
                    doc_en_by_id[c.function_id] = enriched.get('doc_en') or ''
                    inputs_json_by_id[c.function_id] = enriched.get('inputs_json') or '{}'
                    outputs_json_by_id[c.function_id] = enriched.get('outputs_json') or '{}'
            except Exception as e:
                detail = str(e) or type(e).__name__
                raise HTTPException(status_code=502, detail=f'aliyun_enrich_failed: {detail}')

        keep_ids = [c.function_id for c in chunks]
        existed = self._store.count_existing_function_ids(keep_ids)
        added = len(keep_ids) - int(existed)

        upserted = self._store.upsert_functions(
            chunks,
            display_name_by_id=display_name_by_id,
            module_by_id=module_by_id,
            module_source_by_id=module_source_by_id,
            kind_by_id=kind_by_id,
            kind_source_by_id=kind_source_by_id,
            doc_zh_by_id=doc_zh_by_id,
            doc_en_by_id=doc_en_by_id,
            inputs_json_by_id=inputs_json_by_id,
            outputs_json_by_id=outputs_json_by_id,
        )

        deleted = 0
        keep_ids_all = [c.function_id for c in chunks]
        if max_functions is None and keep_ids_all:
            deleted = self._store.sync_root_functions(root_dir=res.root_dir, keep_function_ids=keep_ids_all)

        to_embed = self._store.list_functions_for_embedding(root_dir=res.root_dir, limit=None)
        vectors = 0
        batch = 64
        items: list[tuple[str, bytes, int]] = []
        for idx in range(0, len(to_embed), batch):
            part = to_embed[idx : idx + batch]
            texts = []
            ids = []
            for it in part:
                fid = str(it['function_id'])
                ids.append(fid)
                texts.append(
                    f"file_path: {it['file_path']}\nmodule: {it['module']}\nkind: {it.get('kind') or 'glue'}\nname: {it['display_name']}\nsignature: {it['signature']}\n\ninputs: {it.get('inputs_json') or '{}'}\noutputs: {it.get('outputs_json') or '{}'}\n\n{it['doc_zh']}\n\n{it.get('doc_en') or ''}\n\n{it['code']}"
                )

            try:
                embs = embed_texts(texts)
            except Exception as e:
                detail = str(e) or type(e).__name__
                raise HTTPException(status_code=502, detail=f'aliyun_embed_failed: {detail}')
            for fid, vec in zip(ids, embs):
                blob, dim = pack_embedding(vec)
                items.append((fid, blob, dim))
            if len(items) >= 256:
                vectors += self._store.set_embeddings(items)
                items = []

        if items:
            vectors += self._store.set_embeddings(items)

        self._archive.append_event(
            'rag.index',
            {
                'root_dir': res.root_dir,
                'files': res.files,
                'functions': res.functions,
                'upserted': upserted,
                'added': int(added),
                'deleted': deleted,
                'vectors': vectors,
                'enrich': bool(enrich),
            },
        )
        return {
            'root_dir': res.root_dir,
            'indexed': True,
            'files': res.files,
            'functions': res.functions,
            'upserted': upserted,
            'added': int(added),
            'deleted': deleted,
            'vectors': vectors,
        }

    def start_index_job(self, root_dir: str, *, enrich: bool = True, max_functions: int | None = None) -> dict:
        job = index_job_registry.create(
            root_dir=str(Path(root_dir).resolve()),
            enrich=bool(enrich),
            max_functions=max_functions,
        )

        t = threading.Thread(
            target=self._run_index_job,
            kwargs={'job_id': job.job_id},
            daemon=True,
        )
        t.start()
        return {'ok': True, 'job_id': job.job_id}

    def start_module_index_job(self, root_dir: str) -> dict:
        job = module_job_registry.create(root_dir=str(Path(root_dir).resolve()))
        t = threading.Thread(
            target=self._run_module_index_job,
            kwargs={'job_id': job.job_id},
            daemon=True,
        )
        t.start()
        return {'ok': True, 'job_id': job.job_id}

    def get_module_index_job(self, job_id: str) -> dict:
        job = module_job_registry.get(job_id)
        if not job:
            return {'ok': False, 'error': 'not_found'}
        return {'ok': True, 'job': job.to_dict()}

    def cancel_module_index_job(self, job_id: str) -> dict:
        ok = module_job_registry.cancel(job_id)
        return {'ok': bool(ok)}

    def get_index_job(self, job_id: str) -> dict:
        job = index_job_registry.get(job_id)
        if not job:
            return {'ok': False, 'error': 'not_found'}
        return {'ok': True, 'job': job.to_dict()}

    def cancel_index_job(self, job_id: str) -> dict:
        ok = index_job_registry.cancel(job_id)
        return {'ok': bool(ok)}

    def _run_index_job(self, *, job_id: str) -> None:
        job = index_job_registry.get(job_id)
        if not job:
            return

        try:
            index_job_registry.touch(job, stage='scanning')

            def on_file(done: int, total: int, file_path: str) -> None:
                if job._cancel_event.is_set():
                    raise RuntimeError('canceled')
                index_job_registry.touch(
                    job,
                    total_files=int(total),
                    processed_files=int(done),
                    current_file=str(file_path),
                )

            res = scan_directory(job.root_dir, on_file=on_file)
            chunks = res.chunks
            if job.max_functions is not None:
                chunks = chunks[: max(0, int(job.max_functions))]
            index_job_registry.touch(job, total_files=int(res.files), total_functions=len(chunks))

            display_name_by_id: dict[str, str] = {}
            module_by_id: dict[str, str] = {}
            module_source_by_id: dict[str, str] = {}
            kind_by_id: dict[str, str] = {}
            kind_source_by_id: dict[str, str] = {}
            doc_zh_by_id: dict[str, str] = {}
            doc_en_by_id: dict[str, str] = {}
            inputs_json_by_id: dict[str, str] = {}
            outputs_json_by_id: dict[str, str] = {}

            if job.enrich:
                index_job_registry.touch(job, stage='enriching', processed_functions=0)
                for idx, c in enumerate(chunks):
                    if job._cancel_event.is_set():
                        raise RuntimeError('canceled')
                    index_job_registry.touch(job, processed_functions=idx + 1, current_file=str(c.file_path))
                    enriched = enrich_function(file_path=c.file_path, signature=c.signature, code=c.code)
                    display_name_by_id[c.function_id] = enriched['display_name']
                    module_by_id[c.function_id] = enriched['module']
                    module_source_by_id[c.function_id] = 'llm'
                    kind_by_id[c.function_id] = enriched.get('kind') or 'glue'
                    kind_source_by_id[c.function_id] = 'llm'
                    doc_zh_by_id[c.function_id] = enriched['doc_zh']
                    doc_en_by_id[c.function_id] = enriched.get('doc_en') or ''
                    inputs_json_by_id[c.function_id] = enriched.get('inputs_json') or '{}'
                    outputs_json_by_id[c.function_id] = enriched.get('outputs_json') or '{}'

            index_job_registry.touch(job, stage='upserting')

            keep_ids = [c.function_id for c in chunks]
            existed = self._store.count_existing_function_ids(keep_ids)
            added = len(keep_ids) - int(existed)

            self._store.upsert_functions(
                chunks,
                display_name_by_id=display_name_by_id,
                module_by_id=module_by_id,
                module_source_by_id=module_source_by_id,
                kind_by_id=kind_by_id,
                kind_source_by_id=kind_source_by_id,
                doc_zh_by_id=doc_zh_by_id,
                doc_en_by_id=doc_en_by_id,
                inputs_json_by_id=inputs_json_by_id,
                outputs_json_by_id=outputs_json_by_id,
            )

            deleted = 0
            if job.max_functions is None and keep_ids:
                deleted = self._store.sync_root_functions(root_dir=res.root_dir, keep_function_ids=keep_ids)

            index_job_registry.touch(job, stage='embedding')
            to_embed = self._store.list_functions_for_embedding(root_dir=res.root_dir, limit=None)
            total_embeddings = len(to_embed)
            index_job_registry.touch(job, total_embeddings=total_embeddings, processed_embeddings=0)

            vectors = 0
            batch = 64
            items: list[tuple[str, bytes, int]] = []
            embedded_so_far = 0

            for idx in range(0, len(to_embed), batch):
                if job._cancel_event.is_set():
                    raise RuntimeError('canceled')
                part = to_embed[idx : idx + batch]
                texts: list[str] = []
                ids: list[str] = []
                for it in part:
                    fid = str(it['function_id'])
                    ids.append(fid)
                    texts.append(
                        f"file_path: {it['file_path']}\nmodule: {it['module']}\nkind: {it.get('kind') or 'glue'}\nname: {it['display_name']}\nsignature: {it['signature']}\n\ninputs: {it.get('inputs_json') or '{}'}\noutputs: {it.get('outputs_json') or '{}'}\n\n{it['doc_zh']}\n\n{it.get('doc_en') or ''}\n\n{it['code']}"
                    )
                if part:
                    index_job_registry.touch(job, current_file=str(part[0].get('file_path') or ''))

                embs = embed_texts(texts)
                for fid, vec in zip(ids, embs):
                    blob, dim = pack_embedding(vec)
                    items.append((fid, blob, dim))

                embedded_so_far += len(ids)
                index_job_registry.touch(job, processed_embeddings=embedded_so_far)

                if len(items) >= 256:
                    vectors += self._store.set_embeddings(items)
                    items = []

            if items:
                vectors += self._store.set_embeddings(items)

            index_job_registry.touch(job, stage='done')
            self._archive.append_event(
                'rag.index_job',
                {
                    'job_id': job.job_id,
                    'root_dir': res.root_dir,
                    'files': res.files,
                    'functions': len(chunks),
                    'vectors': vectors,
                    'added': int(added),
                    'deleted': deleted,
                    'enrich': bool(job.enrich),
                },
            )

        except Exception as e:
            msg = str(e) or type(e).__name__
            if msg == 'canceled':
                index_job_registry.touch(job, stage='canceled', canceled=True)
            else:
                index_job_registry.touch(job, stage='error', error=msg)

    def _run_module_index_job(self, *, job_id: str) -> None:
        job = module_job_registry.get(job_id)
        if not job:
            return

        try:
            module_job_registry.touch(job, stage='scanning')

            def on_file(done: int, total: int, file_path: str) -> None:
                if job._cancel_event.is_set():
                    raise RuntimeError('canceled')
                module_job_registry.touch(
                    job,
                    total_files=int(total),
                    processed_files=int(done),
                    current_file=str(file_path),
                )

            res = scan_directory(job.root_dir, on_file=on_file)

            module_job_registry.touch(job, stage='discovering', current_file=None)
            sym_index = self._store.list_function_symbol_index(root_dir=res.root_dir)
            candidates = discover_module_candidates(
                root_dir=res.root_dir,
                chunks=res.chunks,
                symbol_to_function_id=sym_index,
                min_called_functions=3,
            )
            module_job_registry.touch(job, total_candidates=len(candidates), processed_candidates=0)

            embedded_so_far = 0
            module_job_registry.touch(job, stage='embedding', total_embeddings=len(candidates), processed_embeddings=0)

            for idx, cand in enumerate(candidates):
                if job._cancel_event.is_set():
                    raise RuntimeError('canceled')

                module_job_registry.touch(job, processed_candidates=idx + 1)

                entry = self._store.get_function(cand.entry_function_id)
                if not entry:
                    continue

                node_ids = [cand.entry_function_id] + list(cand.called_function_ids)
                nodes: list[dict] = []
                for i, fid in enumerate(node_ids):
                    fn = self._store.get_function(fid)
                    if not fn:
                        continue
                    nodes.append(
                        {
                            'id': fid,
                            'function_id': fid,
                            'display_name': str(fn.get('display_name') or ''),
                            'module': str(fn.get('module') or 'common'),
                            'kind': str(fn.get('kind') or 'glue'),
                            'file_path': str(fn.get('file_path') or ''),
                            'signature': str(fn.get('signature') or ''),
                            'x': int((i % 3) * 260),
                            'y': int((i // 3) * 140),
                            'inputsJson': str(fn.get('inputs_json') or '{}'),
                            'outputsJson': str(fn.get('outputs_json') or '{}'),
                            'paramsJson': '{}',
                            'testCwd': str(res.root_dir),
                            'testCmd': '',
                        }
                    )

                edges = [{'id': f"e{i}", 'from': e['from'], 'to': e['to']} for i, e in enumerate(cand.edges)]

                graph_for_llm = {
                    'entry': {
                        'function_id': str(entry.get('function_id')),
                        'display_name': str(entry.get('display_name') or ''),
                        'module': str(entry.get('module') or ''),
                        'kind': str(entry.get('kind') or 'glue'),
                        'signature': str(entry.get('signature') or ''),
                        'file_path': str(entry.get('file_path') or ''),
                    },
                    'nodes': [
                        {
                            'function_id': n['function_id'],
                            'display_name': n['display_name'],
                            'module': n['module'],
                            'kind': n['kind'],
                            'file_path': n['file_path'],
                        }
                        for n in nodes
                    ],
                    'edges': [{'from': e['from'], 'to': e['to']} for e in cand.edges],
                }

                enriched = enrich_module(
                    module_key=cand.module_key,
                    display_name_hint=str(entry.get('display_name') or cand.module_key),
                    graph=graph_for_llm,
                )

                self._store.upsert_module(
                    module_key=cand.module_key,
                    root_dir=res.root_dir,
                    entry_function_id=cand.entry_function_id,
                    display_name=enriched.get('display_name') or cand.module_key,
                    doc_zh=enriched.get('doc_zh') or '',
                    doc_en=enriched.get('doc_en') or '',
                    inputs_json=enriched.get('inputs_json') or '{}',
                    outputs_json=enriched.get('outputs_json') or '{}',
                    nodes_json=json.dumps(nodes, ensure_ascii=False),
                    edges_json=json.dumps(edges, ensure_ascii=False),
                    source='discovered',
                    reset_embedding=True,
                )

                try:
                    text = (
                        f"module_key: {cand.module_key}\nroot_dir: {res.root_dir}\n"
                        f"name: {enriched.get('display_name') or cand.module_key}\n"
                        f"inputs: {enriched.get('inputs_json') or '{}'}\noutputs: {enriched.get('outputs_json') or '{}'}\n\n"
                        f"{enriched.get('doc_zh') or ''}\n\n{enriched.get('doc_en') or ''}\n\n"
                        f"graph: {json.dumps(graph_for_llm, ensure_ascii=False)}"
                    )
                    vec = embed_texts([text])[0]
                    blob, dim = pack_embedding(vec)
                    self._store.set_module_embedding(module_key=cand.module_key, embedding=blob, dim=dim)
                except Exception:
                    pass

                embedded_so_far += 1
                module_job_registry.touch(job, processed_embeddings=embedded_so_far)

            module_job_registry.touch(job, stage='done', current_file=None)
            self._archive.append_event(
                'rag.module_index_job',
                {
                    'job_id': job.job_id,
                    'root_dir': res.root_dir,
                    'candidates': len(candidates),
                },
            )
        except Exception as e:
            msg = str(e) or type(e).__name__
            if msg == 'canceled':
                module_job_registry.touch(job, stage='canceled', canceled=True)
            else:
                module_job_registry.touch(job, stage='error', error=msg)

    def list_indexed_modules(self, *, root_dir: str | None = None, q: str | None = None, limit: int = 200, offset: int = 0) -> dict:
        root = str(Path(root_dir).resolve()) if root_dir else None
        return self._store.list_indexed_modules(root_dir=root, q=q, limit=limit, offset=offset)

    def get_module(self, module_key: str) -> dict:
        m = self._store.get_module(module_key)
        if not m:
            return {'ok': False, 'error': 'not_found'}
        try:
            nodes = json.loads(str(m.get('nodes_json') or '[]'))
            if isinstance(nodes, list):
                fids = [str(n.get('function_id') or '') for n in nodes if isinstance(n, dict) and n.get('function_id')]
                meta = self._store.get_functions_meta(fids)
                changed = False
                for n in nodes:
                    if not isinstance(n, dict):
                        continue
                    fid = str(n.get('function_id') or '')
                    if not fid:
                        continue
                    mm = meta.get(fid)
                    if not mm:
                        continue
                    if mm.get('kind') and str(n.get('kind') or '') != str(mm.get('kind')):
                        n['kind'] = str(mm.get('kind'))
                        changed = True
                    if mm.get('module') and str(n.get('module') or '') != str(mm.get('module')):
                        n['module'] = str(mm.get('module'))
                        changed = True
                    if mm.get('display_name') and str(n.get('display_name') or '') != str(mm.get('display_name')):
                        n['display_name'] = str(mm.get('display_name'))
                        changed = True
                if changed:
                    m['nodes_json'] = json.dumps(nodes, ensure_ascii=False)
        except Exception:
            pass
        return {'ok': True, 'module': m}

    def upsert_module(self, *, module: dict, root_dir: str) -> dict:
        module_key = str(module.get('module_key') or '').strip()
        if not module_key:
            return {'ok': False, 'error': 'missing_module_key'}
        display_name = str(module.get('display_name') or module_key)
        entry_function_id = str(module.get('entry_function_id') or '')
        nodes_json = json.dumps(module.get('nodes') or [], ensure_ascii=False)
        edges_json = json.dumps(module.get('edges') or [], ensure_ascii=False)
        doc_zh = str(module.get('doc_zh') or '')
        doc_en = str(module.get('doc_en') or '')
        inputs_json = json.dumps(module.get('inputs') or {}, ensure_ascii=False) if isinstance(module.get('inputs'), (dict, list)) else str(module.get('inputs_json') or '{}')
        outputs_json = json.dumps(module.get('outputs') or {}, ensure_ascii=False) if isinstance(module.get('outputs'), (dict, list)) else str(module.get('outputs_json') or '{}')
        source = str(module.get('source') or 'manual')

        self._store.upsert_module(
            module_key=module_key,
            root_dir=root_dir,
            entry_function_id=entry_function_id,
            display_name=display_name,
            doc_zh=doc_zh,
            doc_en=doc_en,
            inputs_json=inputs_json,
            outputs_json=outputs_json,
            nodes_json=nodes_json,
            edges_json=edges_json,
            source=source,
            reset_embedding=True,
        )

        try:
            text = (
                f"module_key: {module_key}\nroot_dir: {root_dir}\nname: {display_name}\n"
                f"inputs: {inputs_json}\noutputs: {outputs_json}\n\n{doc_zh}\n\n{doc_en}\n"
                f"nodes: {nodes_json}\nedges: {edges_json}"
            )
            vec = embed_texts([text])[0]
            blob, dim = pack_embedding(vec)
            self._store.set_module_embedding(module_key=module_key, embedding=blob, dim=dim)
        except Exception:
            pass

        return {'ok': True, 'module': self._store.get_module(module_key)}

    def publish_module(
        self,
        *,
        root_dir: str,
        graph: dict,
        module_key: str | None = None,
        display_name_hint: str = '',
        source: str = 'builder',
        similarity_threshold: float = 0.92,
    ) -> dict:
        root = str(Path(root_dir).resolve())
        mk = str(module_key or '').strip() or f"builder_{uuid4().hex[:12]}"

        enriched = {
            'display_name': display_name_hint or mk,
            'doc_zh': '',
            'doc_en': '',
            'inputs_json': '{}',
            'outputs_json': '{}',
        }
        try:
            enriched = enrich_module(module_key=mk, display_name_hint=display_name_hint, graph=graph)
        except Exception:
            pass

        chosen_key = mk
        matched: dict | None = None
        emb_vec: list[float] | None = None
        try:
            text = (
                f"module_key: {mk}\nroot_dir: {root}\nname: {enriched.get('display_name') or mk}\n"
                f"inputs: {enriched.get('inputs_json') or '{}'}\noutputs: {enriched.get('outputs_json') or '{}'}\n\n"
                f"{enriched.get('doc_zh') or ''}\n\n{enriched.get('doc_en') or ''}\n\n"
                f"graph: {json.dumps(graph, ensure_ascii=False)[:12000]}"
            )
            emb_vec = embed_texts([text])[0]
            matched = (self._store.query_similar_modules(emb_vec, top_k=1) or [None])[0]
            if not module_key and matched and float(matched.get('score') or 0.0) >= float(similarity_threshold):
                chosen_key = str(matched.get('module_key') or mk)
        except Exception:
            matched = None
            emb_vec = None

        module_obj = {
            'module_key': chosen_key,
            'display_name': str(enriched.get('display_name') or chosen_key),
            'entry_function_id': '',
            'doc_zh': str(enriched.get('doc_zh') or ''),
            'doc_en': str(enriched.get('doc_en') or ''),
            'inputs_json': str(enriched.get('inputs_json') or '{}'),
            'outputs_json': str(enriched.get('outputs_json') or '{}'),
            'nodes': graph.get('nodes') or [],
            'edges': graph.get('edges') or [],
            'source': str(source or 'builder'),
        }

        out = self.upsert_module(module=module_obj, root_dir=root)

        try:
            if emb_vec is not None:
                blob, dim = pack_embedding(emb_vec)
                self._store.set_module_embedding(module_key=chosen_key, embedding=blob, dim=dim)
        except Exception:
            pass

        return {
            'ok': bool(out.get('ok')),
            'module': out.get('module'),
            'replaced': bool(chosen_key != mk),
            'matched': matched,
        }

    def delete_modules(self, *, module_keys: list[str]) -> dict:
        deleted = self._store.delete_modules(module_keys)
        self._archive.append_event('rag.delete_modules', {'count': int(deleted)})
        return {'ok': True, 'deleted': int(deleted)}

    def enrich_function_now(self, *, function_id: str, root_dir: str | None = None) -> dict:
        fn = self._store.get_function(function_id)
        if not fn:
            return {'ok': False, 'error': 'not_found'}

        root = root_dir or get_default_rag_root()
        ensure_under_root(root_dir=root, file_path=str(fn['file_path']))

        enriched = enrich_function(file_path=str(fn['file_path']), signature=str(fn['signature']), code=str(fn['code']))
        ok = self._store.update_function_docs(
            function_id=function_id,
            display_name=enriched.get('display_name') or None,
            module=enriched.get('module') or None,
            module_source='llm',
            kind=enriched.get('kind') or None,
            kind_source='llm',
            doc_zh=enriched.get('doc_zh') or '',
            doc_en=enriched.get('doc_en') or '',
            inputs_json=enriched.get('inputs_json') or '{}',
            outputs_json=enriched.get('outputs_json') or '{}',
            reset_embedding=True,
        )
        if not ok:
            return {'ok': False, 'error': 'update_failed'}

        try:
            vec = embed_texts(
                [
                    f"file_path: {fn['file_path']}\nmodule: {enriched.get('module') or fn['module']}\nkind: {enriched.get('kind') or fn.get('kind') or 'glue'}\nname: {enriched.get('display_name') or fn['display_name']}\nsignature: {fn['signature']}\n\ninputs: {enriched.get('inputs_json') or '{}'}\noutputs: {enriched.get('outputs_json') or '{}'}\n\n{enriched.get('doc_zh') or ''}\n\n{enriched.get('doc_en') or ''}\n\n{fn['code']}"
                ]
            )[0]
        except Exception as e:
            detail = str(e) or type(e).__name__
            raise HTTPException(status_code=502, detail=f'aliyun_embed_failed: {detail}')

        blob, dim = pack_embedding(vec)
        self._store.set_embeddings([(function_id, blob, dim)])
        return {'ok': True, 'function': self._store.get_function(function_id)}

    def start_backfill_docs_job(self, *, root_dir: str | None = None, limit: int = 2000) -> dict:
        root = str(Path(root_dir).resolve()) if root_dir else None
        job = doc_job_registry.create(root_dir=root)
        t = threading.Thread(
            target=self._run_backfill_docs_job,
            kwargs={'job_id': job.job_id, 'limit': int(limit)},
            daemon=True,
        )
        t.start()
        return {'ok': True, 'job_id': job.job_id}

    def start_kind_job(self, *, root_dir: str | None = None) -> dict:
        root = str(Path(root_dir).resolve()) if root_dir else None
        job = kind_job_registry.create(root_dir=root)
        t = threading.Thread(
            target=self._run_kind_job,
            kwargs={'job_id': job.job_id},
            daemon=True,
        )
        t.start()
        return {'ok': True, 'job_id': job.job_id}

    def get_kind_job(self, job_id: str) -> dict:
        job = kind_job_registry.get(job_id)
        if not job:
            return {'ok': False, 'error': 'not_found'}
        return {'ok': True, 'job': job.to_dict()}

    def cancel_kind_job(self, job_id: str) -> dict:
        ok = kind_job_registry.cancel(job_id)
        return {'ok': bool(ok)}

    def _run_kind_job(self, *, job_id: str) -> None:
        job = kind_job_registry.get(job_id)
        if not job:
            return

        try:
            kind_job_registry.touch(job, stage='listing')
            items = self._store.list_functions_for_kind_reclassify(root_dir=job.root_dir)
            kind_job_registry.touch(job, stage='classifying', total=len(items), processed=0)

            processed = 0
            for it in items:
                if job._cancel_event.is_set():
                    raise RuntimeError('canceled')

                fid = str(it.get('function_id') or '')
                fp = str(it.get('file_path') or '')
                kind_job_registry.touch(job, current_function_id=fid, current_file=fp)

                old_kind = str(it.get('kind') or 'glue')
                new_kind = classify_function_kind(file_path=fp, signature=str(it.get('signature') or ''), code=str(it.get('code') or ''))

                if new_kind != old_kind:
                    ok = self._store.update_function_kind(
                        function_id=fid,
                        kind=new_kind,
                        kind_source='llm_v2',
                        reset_embedding=True,
                    )
                    if ok:
                        try:
                            text = (
                                f"file_path: {fp}\nmodule: {it.get('module') or 'common'}\nkind: {new_kind}\n"
                                f"name: {it.get('display_name') or ''}\nsignature: {it.get('signature') or ''}\n\n"
                                f"inputs: {it.get('inputs_json') or '{}'}\noutputs: {it.get('outputs_json') or '{}'}\n\n"
                                f"{it.get('doc_zh') or ''}\n\n{it.get('doc_en') or ''}\n\n{it.get('code') or ''}"
                            )
                            vec = embed_texts([text])[0]
                            blob, dim = pack_embedding(vec)
                            self._store.set_embeddings([(fid, blob, dim)])
                        except Exception:
                            pass

                processed += 1
                kind_job_registry.touch(job, processed=processed)

            try:
                self._store.refresh_modules_node_kinds(root_dir=job.root_dir)
            except Exception:
                pass
            kind_job_registry.touch(job, stage='done', current_function_id=None, current_file=None)

        except Exception as e:
            msg = str(e) or type(e).__name__
            if msg == 'canceled':
                kind_job_registry.touch(job, stage='canceled', canceled=True)
            else:
                kind_job_registry.touch(job, stage='error', error=msg)

    def get_backfill_docs_job(self, job_id: str) -> dict:
        job = doc_job_registry.get(job_id)
        if not job:
            return {'ok': False, 'error': 'not_found'}
        return {'ok': True, 'job': job.to_dict()}

    def cancel_backfill_docs_job(self, job_id: str) -> dict:
        ok = doc_job_registry.cancel(job_id)
        return {'ok': bool(ok)}

    def _run_backfill_docs_job(self, *, job_id: str, limit: int) -> None:
        job = doc_job_registry.get(job_id)
        if not job:
            return
        try:
            doc_job_registry.touch(job, stage='listing')
            missing = self._store.list_functions_missing_docs(root_dir=job.root_dir, limit=int(limit), offset=0)
            items = list(missing.get('items') or [])
            doc_job_registry.touch(job, stage='enriching', total=len(items), processed=0)
            processed = 0
            for it in items:
                if job._cancel_event.is_set():
                    raise RuntimeError('canceled')
                fid = str(it['function_id'])
                fp = str(it['file_path'])
                doc_job_registry.touch(job, current_file=fp, current_function_id=fid)
                enriched = enrich_function(file_path=fp, signature=str(it['signature']), code=str(it['code']))
                ok = self._store.update_function_docs(
                    function_id=fid,
                    display_name=enriched.get('display_name') or None,
                    module=enriched.get('module') or None,
                    module_source='llm',
                    kind=enriched.get('kind') or None,
                    kind_source='llm',
                    doc_zh=enriched.get('doc_zh') or '',
                    doc_en=enriched.get('doc_en') or '',
                    inputs_json=enriched.get('inputs_json') or '{}',
                    outputs_json=enriched.get('outputs_json') or '{}',
                    reset_embedding=True,
                )
                if ok:
                    try:
                        vec = embed_texts(
                            [
                                f"file_path: {fp}\nmodule: {enriched.get('module') or it.get('module') or 'common'}\nkind: {enriched.get('kind') or it.get('kind') or 'glue'}\nname: {enriched.get('display_name') or it.get('display_name') or ''}\nsignature: {it.get('signature') or ''}\n\ninputs: {enriched.get('inputs_json') or '{}'}\noutputs: {enriched.get('outputs_json') or '{}'}\n\n{enriched.get('doc_zh') or ''}\n\n{enriched.get('doc_en') or ''}\n\n{it.get('code') or ''}"
                            ]
                        )[0]
                        blob, dim = pack_embedding(vec)
                        self._store.set_embeddings([(fid, blob, dim)])
                    except Exception:
                        pass
                processed += 1
                doc_job_registry.touch(job, processed=processed)

            doc_job_registry.touch(job, stage='done', processed=len(items), current_file=None, current_function_id=None)
        except Exception as e:
            msg = str(e) or type(e).__name__
            if msg == 'canceled':
                doc_job_registry.touch(job, stage='canceled', canceled=True)
            else:
                doc_job_registry.touch(job, stage='error', error=msg)

    def query(self, query: str, top_k: int, *, module: str | None = None) -> list[RagQueryHit]:
        try:
            q_emb = embed_texts([query])[0]
        except Exception as e:
            detail = str(e) or type(e).__name__
            raise HTTPException(status_code=502, detail=f'aliyun_embed_failed: {detail}')
        hits = self._store.query_similar(q_emb, top_k=top_k, module=module)
        self._archive.append_event(
            'rag.query',
            {
                'query': query,
                'top_k': int(top_k),
                'module': module,
                'hits': len(hits),
            },
        )
        return [
            RagQueryHit(
                function_id=h.function_id,
                name=h.name,
                module=h.module,
                score=h.score,
                file_path=h.file_path,
                signature=h.signature,
                doc_zh=h.doc_zh,
            )
            for h in hits
        ]

    def list_modules(self, *, root_dir: str | None = None) -> dict:
        root = str(Path(root_dir).resolve()) if root_dir else None
        modules = self._store.list_modules(root_dir=root)
        total = sum(int(m.get('count') or 0) for m in modules)
        embedded = sum(int(m.get('embedded') or 0) for m in modules)
        return {
            'total': int(total),
            'embedded': int(embedded),
            'modules': modules,
        }

    def list_functions(
        self,
        *,
        root_dir: str | None = None,
        module: str | None = None,
        kind: str | None = None,
        q: str | None = None,
        limit: int = 200,
        offset: int = 0,
    ) -> dict:
        root = str(Path(root_dir).resolve()) if root_dir else None
        return self._store.list_functions(root_dir=root, module=module, kind=kind, q=q, limit=limit, offset=offset)

    def save_function_source(
        self,
        *,
        function_id: str,
        new_code: str,
        write_file: bool = True,
        root_dir: str | None = None,
        re_enrich: bool = False,
    ) -> dict:
        fn = self._store.get_function(function_id)
        if not fn:
            return {'ok': False, 'error': 'not_found'}

        root = root_dir or get_default_rag_root()
        ensure_under_root(root_dir=root, file_path=str(fn['file_path']))

        patch_meta = None
        new_end_line = int(fn['end_line'])
        if write_file:
            patch_meta = replace_lines_in_file(
                file_path=str(fn['file_path']),
                start_line=int(fn['start_line']),
                end_line=int(fn['end_line']),
                new_text=new_code,
            )
            new_end_line = int(patch_meta['new_end_line'])

        display_name = None
        module = None
        doc_zh = None
        doc_en = None
        inputs_json = None
        outputs_json = None
        if re_enrich:
            try:
                enriched = enrich_function(file_path=str(fn['file_path']), signature=str(fn['signature']), code=new_code)
                display_name = enriched['display_name']
                module = enriched['module']
                doc_kind = enriched.get('kind') or None
                doc_zh = enriched['doc_zh']
                doc_en = enriched.get('doc_en') or ''
                inputs_json = enriched.get('inputs_json') or '{}'
                outputs_json = enriched.get('outputs_json') or '{}'
            except Exception as e:
                detail = str(e) or type(e).__name__
                raise HTTPException(status_code=502, detail=f'aliyun_enrich_failed: {detail}')

        kind = None
        kind_source = None
        module_source = None
        if re_enrich:
            kind = doc_kind
            kind_source = 'llm'
            module_source = 'llm'

        ok = self._store.update_function_source(
            function_id=function_id,
            new_code=new_code,
            new_end_line=new_end_line,
            display_name=display_name,
            module=module,
            module_source=module_source,
            kind=kind,
            kind_source=kind_source,
            doc_zh=doc_zh,
            doc_en=doc_en,
            inputs_json=inputs_json,
            outputs_json=outputs_json,
            reset_embedding=True,
        )
        if not ok:
            return {'ok': False, 'error': 'update_failed'}

        try:
            vec = embed_texts(
                [
                    f"file_path: {fn['file_path']}\nmodule: {module or fn['module']}\nkind: {kind or fn.get('kind') or 'glue'}\nname: {display_name or fn['display_name']}\nsignature: {fn['signature']}\n\ninputs: {inputs_json or fn.get('inputs_json') or '{}'}\noutputs: {outputs_json or fn.get('outputs_json') or '{}'}\n\n{doc_zh or fn['doc_zh']}\n\n{doc_en or fn.get('doc_en') or ''}\n\n{new_code}"
                ]
            )[0]
        except Exception as e:
            detail = str(e) or type(e).__name__
            raise HTTPException(status_code=502, detail=f'aliyun_embed_failed: {detail}')

        blob, dim = pack_embedding(vec)
        self._store.set_embeddings([(function_id, blob, dim)])

        self._archive.append_event(
            'rag.save_source',
            {
                'function_id': function_id,
                'file_path': str(fn['file_path']),
                'write_file': bool(write_file),
                're_enrich': bool(re_enrich),
                'patch': patch_meta,
            },
        )
        return {'ok': True, 'patch': patch_meta, 'function': self._store.get_function(function_id)}

    def run_test(self, *, cwd: str, command: str, timeout_ms: int = 60000) -> dict:
        res = run_command(cwd=cwd, command=command, timeout_ms=timeout_ms)
        self._archive.append_event(
            'rag.test_run',
            {
                'cwd': cwd,
                'command': command,
                'timeout_ms': int(timeout_ms),
                'ok': bool(res.get('ok')),
                'exit_code': int(res.get('exit_code') or 0),
                'duration_ms': int(res.get('duration_ms') or 0),
            },
        )
        return res

    def delete_functions(self, *, function_ids: list[str]) -> dict:
        deleted = self._store.delete_functions([str(fid) for fid in function_ids if str(fid).strip()])
        self._archive.append_event(
            'rag.delete_functions',
            {
                'count': int(deleted),
            },
        )
        return {'ok': True, 'deleted': int(deleted)}

    def delete_by_root_dir(self, *, root_dir: str) -> dict:
        p = Path(str(root_dir)).resolve()
        if str(p) == p.anchor:
            raise HTTPException(status_code=400, detail='refuse_delete_root')
        deleted = self._store.delete_by_root_dir(root_dir=str(p))
        self._archive.append_event(
            'rag.delete_by_root',
            {
                'root_dir': str(p),
                'deleted': int(deleted),
            },
        )
        return {'ok': True, 'deleted': int(deleted)}

    def get_function(self, function_id: str) -> dict:
        fn = self._store.get_function(function_id)
        if not fn:
            return {'ok': False, 'error': 'not_found'}
        return {'ok': True, 'function': fn}

    def status(self) -> dict:
        return self._store.stats()

    def rebase_paths(self) -> dict:
        res = self._store.rebase_paths()
        if int(res.get('updated') or 0) > 0:
            self._archive.append_event('rag.rebase_paths', res)
        return {'ok': True, **res}
