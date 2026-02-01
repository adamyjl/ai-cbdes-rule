from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from backend.app.services.data_dir import get_data_dir


@dataclass
class ReleaseModuleStore:
    def __post_init__(self) -> None:
        self._path = get_data_dir() / 'release_modules.json'
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.write_text('[]', encoding='utf-8')

    def _load(self) -> list[dict]:
        try:
            raw = self._path.read_text(encoding='utf-8')
            v = json.loads(raw)
            return v if isinstance(v, list) else []
        except Exception:
            return []

    def _save(self, items: list[dict]) -> None:
        self._path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding='utf-8')

    def upsert_modules(self, modules: list[dict]) -> int:
        items = self._load()
        idx: dict[str, int] = {}
        for i, it in enumerate(items):
            k = str(it.get('module_key') or '')
            if k:
                idx[k] = i

        now = datetime.now(timezone.utc).isoformat()
        upserted = 0
        for m in modules:
            k = str(m.get('module_key') or '')
            if not k:
                continue
            row = dict(m)
            if 'updated_at' not in row:
                row['updated_at'] = now
            if k in idx:
                items[idx[k]] = row
            else:
                if 'created_at' not in row:
                    row['created_at'] = now
                items.append(row)
                idx[k] = len(items) - 1
            upserted += 1

        self._save(items)
        return upserted

    def list_by_version(self, version: str) -> list[dict]:
        v = str(version)
        out: list[dict] = []
        for it in self._load():
            if str(it.get('version') or '') == v:
                out.append(it)
        return out

