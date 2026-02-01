from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from backend.app.services.code_models import FunctionChunk
from backend.app.services.data_dir import get_data_dir
from backend.app.services.path_rebase import get_app_dir, rebase_file_path


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_parent(p: Path) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class StoredFunction:
    function_id: str
    name: str
    module: str
    score: float
    file_path: str
    signature: str
    doc_zh: str
    doc_en: str


class RagStore:
    def __init__(self) -> None:
        db_path = get_data_dir() / 'rag.sqlite3'
        _ensure_parent(db_path)
        self._db_path = str(db_path)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS functions (
                  function_id TEXT PRIMARY KEY,
                  language TEXT NOT NULL,
                  file_path TEXT NOT NULL,
                  start_line INTEGER NOT NULL,
                  end_line INTEGER NOT NULL,
                  signature TEXT NOT NULL,
                  code TEXT NOT NULL,
                  display_name TEXT NOT NULL,
                  module TEXT NOT NULL,
                  doc_zh TEXT NOT NULL,
                  doc_en TEXT NOT NULL DEFAULT '',
                  inputs_json TEXT NOT NULL DEFAULT '{}',
                  outputs_json TEXT NOT NULL DEFAULT '{}',
                  embedding BLOB,
                  embedding_dim INTEGER,
                  updated_at TEXT NOT NULL
                )
                """
            )
            cols = {r[1] for r in conn.execute("PRAGMA table_info(functions)").fetchall()}
            if 'doc_en' not in cols:
                conn.execute("ALTER TABLE functions ADD COLUMN doc_en TEXT NOT NULL DEFAULT ''")
            if 'inputs_json' not in cols:
                conn.execute("ALTER TABLE functions ADD COLUMN inputs_json TEXT NOT NULL DEFAULT '{}' ")
            if 'outputs_json' not in cols:
                conn.execute("ALTER TABLE functions ADD COLUMN outputs_json TEXT NOT NULL DEFAULT '{}' ")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_functions_module ON functions(module)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_functions_file ON functions(file_path)")

    def upsert_functions(
        self,
        chunks: Iterable[FunctionChunk],
        *,
        display_name_by_id: dict[str, str] | None = None,
        module_by_id: dict[str, str] | None = None,
        doc_zh_by_id: dict[str, str] | None = None,
        doc_en_by_id: dict[str, str] | None = None,
        inputs_json_by_id: dict[str, str] | None = None,
        outputs_json_by_id: dict[str, str] | None = None,
    ) -> int:
        now = _utc_now_iso()
        rows = []
        for c in chunks:
            display = (display_name_by_id or {}).get(c.function_id, c.name)
            mod = (module_by_id or {}).get(c.function_id, 'common')
            doc = (doc_zh_by_id or {}).get(c.function_id, '')
            doc_en = (doc_en_by_id or {}).get(c.function_id, '')
            in_json = (inputs_json_by_id or {}).get(c.function_id, '{}')
            out_json = (outputs_json_by_id or {}).get(c.function_id, '{}')
            rows.append(
                (
                    c.function_id,
                    c.language,
                    c.file_path,
                    c.start_line,
                    c.end_line,
                    c.signature,
                    c.code,
                    display,
                    mod,
                    doc,
                    doc_en,
                    in_json,
                    out_json,
                    None,
                    None,
                    now,
                )
            )

        with self._connect() as conn:
            conn.executemany(
                """
                INSERT INTO functions(
                  function_id, language, file_path, start_line, end_line,
                  signature, code, display_name, module, doc_zh, doc_en,
                  inputs_json, outputs_json,
                  embedding, embedding_dim, updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(function_id) DO UPDATE SET
                  language=excluded.language,
                  file_path=excluded.file_path,
                  start_line=excluded.start_line,
                  end_line=excluded.end_line,
                  signature=excluded.signature,
                  code=excluded.code,
                  display_name=excluded.display_name,
                  module=excluded.module,
                  doc_zh=excluded.doc_zh,
                  doc_en=excluded.doc_en,
                  inputs_json=excluded.inputs_json,
                  outputs_json=excluded.outputs_json,
                  updated_at=excluded.updated_at
                """,
                rows,
            )
        return len(rows)

    def sync_root_functions(self, *, root_dir: str, keep_function_ids: list[str]) -> int:
        root_dir = str(Path(root_dir).resolve())
        with self._connect() as conn:
            conn.execute("DROP TABLE IF EXISTS tmp_keep_functions")
            conn.execute("CREATE TEMP TABLE tmp_keep_functions (function_id TEXT PRIMARY KEY)")
            conn.executemany(
                "INSERT OR IGNORE INTO tmp_keep_functions(function_id) VALUES(?)",
                [(fid,) for fid in keep_function_ids],
            )
            cur = conn.execute(
                """
                DELETE FROM functions
                WHERE file_path LIKE ?
                  AND function_id NOT IN (SELECT function_id FROM tmp_keep_functions)
                """,
                (f"{root_dir}%",),
            )
            conn.execute("DROP TABLE IF EXISTS tmp_keep_functions")
        return int(cur.rowcount or 0)

    def set_embeddings(self, items: Iterable[tuple[str, bytes, int]]) -> int:
        rows = [(emb, dim, _utc_now_iso(), fid) for fid, emb, dim in items]
        with self._connect() as conn:
            conn.executemany(
                """
                UPDATE functions
                SET embedding=?, embedding_dim=?, updated_at=?
                WHERE function_id=?
                """,
                rows,
            )
        return len(rows)

    def list_functions_for_embedding(self, *, root_dir: str | None = None, limit: int | None = None) -> list[dict[str, Any]]:
        sql = "SELECT function_id, code, signature, file_path, display_name, module, doc_zh, doc_en, inputs_json, outputs_json FROM functions WHERE embedding IS NULL"
        params: list[Any] = []
        if root_dir:
            sql += " AND file_path LIKE ?"
            params.append(f"{root_dir}%")
        if limit:
            sql += " LIMIT ?"
            params.append(limit)
        with self._connect() as conn:
            rows = conn.execute(sql, tuple(params)).fetchall()
        return [dict(r) for r in rows]

    def get_function(self, function_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT function_id, language, file_path, start_line, end_line,
                       signature, code, display_name, module, doc_zh, doc_en,
                       inputs_json, outputs_json
                FROM functions
                WHERE function_id=?
                """,
                (function_id,),
            ).fetchone()
        return dict(row) if row else None

    def delete_function(self, function_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM functions WHERE function_id=?", (function_id,))
        return int(cur.rowcount or 0) > 0

    def delete_functions(self, function_ids: list[str]) -> int:
        if not function_ids:
            return 0
        with self._connect() as conn:
            conn.execute("DROP TABLE IF EXISTS tmp_delete_functions")
            conn.execute("CREATE TEMP TABLE tmp_delete_functions (function_id TEXT PRIMARY KEY)")
            conn.executemany(
                "INSERT OR IGNORE INTO tmp_delete_functions(function_id) VALUES(?)",
                [(fid,) for fid in function_ids],
            )
            cur = conn.execute(
                "DELETE FROM functions WHERE function_id IN (SELECT function_id FROM tmp_delete_functions)"
            )
            conn.execute("DROP TABLE IF EXISTS tmp_delete_functions")
        return int(cur.rowcount or 0)

    def delete_by_root_dir(self, *, root_dir: str) -> int:
        root_dir = str(Path(root_dir).resolve())
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM functions WHERE file_path LIKE ?", (f"{root_dir}%",))
        return int(cur.rowcount or 0)

    def count_existing_function_ids(self, function_ids: list[str]) -> int:
        if not function_ids:
            return 0
        with self._connect() as conn:
            conn.execute("DROP TABLE IF EXISTS tmp_existing_functions")
            conn.execute("CREATE TEMP TABLE tmp_existing_functions (function_id TEXT PRIMARY KEY)")
            conn.executemany(
                "INSERT OR IGNORE INTO tmp_existing_functions(function_id) VALUES(?)",
                [(fid,) for fid in function_ids],
            )
            row = conn.execute(
                """
                SELECT COUNT(1) AS c
                FROM functions f
                JOIN tmp_existing_functions t ON t.function_id = f.function_id
                """
            ).fetchone()
            conn.execute("DROP TABLE IF EXISTS tmp_existing_functions")
        return int(row[0] if row else 0)

    def list_functions_missing_docs(
        self,
        *,
        root_dir: str | None = None,
        limit: int = 200,
        offset: int = 0,
    ) -> dict[str, Any]:
        where = ["(doc_zh = '' OR doc_en = '' OR inputs_json = '{}' OR outputs_json = '{}')"]
        params: list[Any] = []
        if root_dir:
            where.append("file_path LIKE ?")
            params.append(f"{root_dir}%")
        where_sql = " WHERE " + " AND ".join(where)
        limit = max(1, min(int(limit), 1000))
        offset = max(0, int(offset))
        with self._connect() as conn:
            total = conn.execute(
                f"SELECT COUNT(1) AS c FROM functions{where_sql}",
                tuple(params),
            ).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT function_id, file_path, signature, code, display_name, module, doc_zh, doc_en, updated_at
                FROM functions
                {where_sql}
                ORDER BY updated_at ASC
                LIMIT ? OFFSET ?
                """,
                tuple(params + [limit, offset]),
            ).fetchall()
        return {
            'total': int(total),
            'items': [dict(r) for r in rows],
            'limit': limit,
            'offset': offset,
        }

    def update_function_docs(
        self,
        *,
        function_id: str,
        display_name: str | None = None,
        module: str | None = None,
        doc_zh: str | None = None,
        doc_en: str | None = None,
        inputs_json: str | None = None,
        outputs_json: str | None = None,
        reset_embedding: bool = True,
    ) -> bool:
        now = _utc_now_iso()
        sets = ["updated_at = ?"]
        params: list[Any] = [now]
        if display_name is not None:
            sets.append("display_name = ?")
            params.append(display_name)
        if module is not None:
            sets.append("module = ?")
            params.append(module)
        if doc_zh is not None:
            sets.append("doc_zh = ?")
            params.append(doc_zh)
        if doc_en is not None:
            sets.append("doc_en = ?")
            params.append(doc_en)
        if inputs_json is not None:
            sets.append("inputs_json = ?")
            params.append(inputs_json)
        if outputs_json is not None:
            sets.append("outputs_json = ?")
            params.append(outputs_json)
        if reset_embedding:
            sets.append("embedding = NULL")
            sets.append("embedding_dim = NULL")
        params.append(function_id)
        with self._connect() as conn:
            cur = conn.execute(
                f"UPDATE functions SET {', '.join(sets)} WHERE function_id = ?",
                tuple(params),
            )
        return int(cur.rowcount or 0) > 0

    def list_modules(self, *, root_dir: str | None = None) -> list[dict[str, Any]]:
        where_sql = ""
        params: tuple[Any, ...] = ()
        if root_dir:
            where_sql = " WHERE file_path LIKE ?"
            params = (f"{root_dir}%",)
        with self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT module, COUNT(1) AS count,
                       SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) AS embedded
                FROM functions
                {where_sql}
                GROUP BY module
                ORDER BY count DESC, module ASC
                """,
                params,
            ).fetchall()
        return [dict(r) for r in rows]

    def list_functions(
        self,
        *,
        root_dir: str | None = None,
        module: str | None = None,
        q: str | None = None,
        limit: int = 200,
        offset: int = 0,
    ) -> dict[str, Any]:
        where = []
        params: list[Any] = []
        if root_dir:
            where.append("file_path LIKE ?")
            params.append(f"{root_dir}%")
        if module:
            where.append("module = ?")
            params.append(module)
        if q:
            where.append("(display_name LIKE ? OR signature LIKE ? OR file_path LIKE ?)")
            pat = f"%{q}%"
            params.extend([pat, pat, pat])

        where_sql = (" WHERE " + " AND ".join(where)) if where else ""
        limit = max(1, min(int(limit), 1000))
        offset = max(0, int(offset))

        with self._connect() as conn:
            total = conn.execute(
                f"SELECT COUNT(1) AS c FROM functions{where_sql}",
                tuple(params),
            ).fetchone()[0]

            rows = conn.execute(
                f"""
                SELECT function_id, language, file_path, start_line, end_line,
                       signature, display_name, module, doc_zh, doc_en,
                       inputs_json, outputs_json,
                       CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END AS embedded,
                       updated_at
                FROM functions
                {where_sql}
                ORDER BY module ASC, file_path ASC, start_line ASC
                LIMIT ? OFFSET ?
                """,
                tuple(params + [limit, offset]),
            ).fetchall()

        return {
            'total': int(total),
            'items': [dict(r) for r in rows],
            'limit': limit,
            'offset': offset,
        }

    def rebase_paths(self) -> dict[str, int]:
        app_dir = get_app_dir()
        data_dir = get_data_dir()
        with self._connect() as conn:
            rows = conn.execute("SELECT function_id, file_path FROM functions").fetchall()
            updates: list[tuple[str, str]] = []
            for r in rows:
                fid = str(r['function_id'])
                fp = str(r['file_path'])
                new_fp = rebase_file_path(fp, app_dir=app_dir, data_dir=data_dir)
                if new_fp != fp:
                    updates.append((new_fp, fid))
            if updates:
                conn.executemany("UPDATE functions SET file_path=? WHERE function_id=?", updates)
        return {'scanned': len(rows), 'updated': len(updates)}

    def update_function_source(
        self,
        *,
        function_id: str,
        new_code: str,
        new_end_line: int | None = None,
        signature: str | None = None,
        display_name: str | None = None,
        module: str | None = None,
        doc_zh: str | None = None,
        doc_en: str | None = None,
        inputs_json: str | None = None,
        outputs_json: str | None = None,
        reset_embedding: bool = True,
    ) -> bool:
        now = _utc_now_iso()
        sets = ["code = ?", "updated_at = ?"]
        params: list[Any] = [new_code, now]

        if new_end_line is not None:
            sets.append("end_line = ?")
            params.append(int(new_end_line))
        if signature is not None:
            sets.append("signature = ?")
            params.append(signature)
        if display_name is not None:
            sets.append("display_name = ?")
            params.append(display_name)
        if module is not None:
            sets.append("module = ?")
            params.append(module)
        if doc_zh is not None:
            sets.append("doc_zh = ?")
            params.append(doc_zh)
        if doc_en is not None:
            sets.append("doc_en = ?")
            params.append(doc_en)
        if inputs_json is not None:
            sets.append("inputs_json = ?")
            params.append(inputs_json)
        if outputs_json is not None:
            sets.append("outputs_json = ?")
            params.append(outputs_json)
        if reset_embedding:
            sets.append("embedding = NULL")
            sets.append("embedding_dim = NULL")

        params.append(function_id)
        with self._connect() as conn:
            cur = conn.execute(
                f"UPDATE functions SET {', '.join(sets)} WHERE function_id = ?",
                tuple(params),
            )
        return int(cur.rowcount or 0) > 0

    def query_similar(
        self,
        query_embedding: list[float],
        *,
        top_k: int,
        module: str | None = None,
    ) -> list[StoredFunction]:
        import math
        from array import array

        q = array('f', query_embedding)
        q_norm = math.sqrt(sum(v * v for v in q)) or 1.0

        sql = (
            "SELECT function_id, display_name, module, file_path, signature, doc_zh, doc_en, embedding, embedding_dim "
            "FROM functions WHERE embedding IS NOT NULL"
        )
        params: tuple[Any, ...] = ()
        if module:
            sql += " AND module=?"
            params = (module,)

        hits: list[StoredFunction] = []
        with self._connect() as conn:
            rows = conn.execute(sql, params)
            for r in rows:
                emb_blob = r['embedding']
                if emb_blob is None:
                    continue
                vec = array('f')
                vec.frombytes(emb_blob)
                if len(vec) != int(r['embedding_dim'] or 0):
                    continue
                dot = 0.0
                v_norm_sq = 0.0
                for a, b in zip(q, vec):
                    dot += a * b
                    v_norm_sq += b * b
                v_norm = math.sqrt(v_norm_sq) or 1.0
                score = dot / (q_norm * v_norm)
                hits.append(
                    StoredFunction(
                        function_id=str(r['function_id']),
                        name=str(r['display_name']),
                        module=str(r['module']),
                        score=float(score),
                        file_path=str(r['file_path']),
                        signature=str(r['signature']),
                        doc_zh=str(r['doc_zh']),
                        doc_en=str(r['doc_en'] or ''),
                    )
                )

        hits.sort(key=lambda x: x.score, reverse=True)
        return hits[: max(1, int(top_k))]

    def stats(self) -> dict[str, Any]:
        with self._connect() as conn:
            total = conn.execute("SELECT COUNT(1) AS c FROM functions").fetchone()[0]
            embedded = conn.execute("SELECT COUNT(1) AS c FROM functions WHERE embedding IS NOT NULL").fetchone()[0]
        return {
            'db_path': self._db_path,
            'functions': int(total),
            'embedded': int(embedded),
        }
