from __future__ import annotations

import threading
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter(prefix='/debug', tags=['debug'])

_lock = threading.Lock()
_panzoom_last: dict | None = None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class PanZoomSelftestIn(BaseModel):
    ok: bool
    before: str | None = None
    after: str | None = None
    note: str | None = None
    at: str | None = None


@router.post('/selftest/panzoom')
def post_panzoom_selftest(req: PanZoomSelftestIn):
    global _panzoom_last
    payload = {
        'ok': bool(req.ok),
        'before': req.before,
        'after': req.after,
        'note': req.note,
        'at': req.at or _utc_now_iso(),
    }
    with _lock:
        _panzoom_last = payload
    return {'ok': True, 'saved': True, 'selftest': payload}


@router.get('/selftest/panzoom')
def get_panzoom_selftest():
    with _lock:
        last = dict(_panzoom_last) if isinstance(_panzoom_last, dict) else None
    return {'ok': True, 'selftest': last}

