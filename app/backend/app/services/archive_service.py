from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from uuid import uuid4

from backend.app.services.data_dir import get_data_dir


@dataclass
class ArchiveService:
    def __post_init__(self) -> None:
        self._events: list[dict] = []
        self._path = get_data_dir() / 'archive.jsonl'
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._load()

    def _load(self) -> None:
        if not self._path.exists():
            return
        try:
            for line in self._path.read_text(encoding='utf-8').splitlines():
                if not line.strip():
                    continue
                self._events.append(json.loads(line))
        except Exception:
            self._events = []

    def _append_file(self, ev: dict) -> None:
        with self._path.open('a', encoding='utf-8') as f:
            f.write(json.dumps(ev, ensure_ascii=False) + '\n')

    def append_event(self, type_: str, payload: dict) -> dict:
        ev = {
            "id": str(uuid4()),
            "type": type_,
            "payload": payload,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        self._events.append(ev)
        self._append_file(ev)
        return ev

    def list_events(self, limit: int = 50) -> list[dict]:
        return list(reversed(self._events))[:limit]
