from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from backend.app.services.data_dir import get_data_dir


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def _log_path(name: str) -> Path:
    root = get_data_dir() / 'logs'
    root.mkdir(parents=True, exist_ok=True)
    return root / name


def write_oplog(*, name: str, event: str, payload: dict) -> None:
    row = {
        'ts': _now_iso(),
        'event': str(event),
        'payload': payload,
    }
    p = _log_path(name)
    try:
        p.open('a', encoding='utf-8').write(json.dumps(row, ensure_ascii=False) + '\n')
    except Exception:
        try:
            (get_data_dir() / 'logs').mkdir(parents=True, exist_ok=True)
            p.open('a', encoding='utf-8').write(json.dumps(row, ensure_ascii=False) + '\n')
        except Exception:
            return

