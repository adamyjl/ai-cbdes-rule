from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class KindJob:
    job_id: str
    root_dir: str | None
    stage: str
    started_at: str
    updated_at: str
    total: int
    processed: int
    current_function_id: str | None
    current_file: str | None
    error: str | None
    canceled: bool
    _cancel_event: threading.Event

    def to_dict(self) -> dict[str, Any]:
        pct = (self.processed / self.total * 100.0) if self.total > 0 else 0.0
        return {
            'job_id': self.job_id,
            'root_dir': self.root_dir,
            'stage': self.stage,
            'started_at': self.started_at,
            'updated_at': self.updated_at,
            'total': self.total,
            'processed': self.processed,
            'percent': pct,
            'current_function_id': self.current_function_id,
            'current_file': self.current_file,
            'error': self.error,
            'canceled': bool(self.canceled),
        }


class KindJobRegistry:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: dict[str, KindJob] = {}

    def create(self, *, root_dir: str | None) -> KindJob:
        with self._lock:
            job_id = str(uuid4())
            job = KindJob(
                job_id=job_id,
                root_dir=root_dir,
                stage='queued',
                started_at=_utc_now_iso(),
                updated_at=_utc_now_iso(),
                total=0,
                processed=0,
                current_function_id=None,
                current_file=None,
                error=None,
                canceled=False,
                _cancel_event=threading.Event(),
            )
            self._jobs[job_id] = job
            return job

    def get(self, job_id: str) -> KindJob | None:
        with self._lock:
            return self._jobs.get(job_id)

    def cancel(self, job_id: str) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            job._cancel_event.set()
            job.canceled = True
            job.stage = 'canceled'
            job.updated_at = _utc_now_iso()
            return True

    def touch(self, job: KindJob, **fields: Any) -> None:
        with self._lock:
            for k, v in fields.items():
                if hasattr(job, k):
                    setattr(job, k, v)
            job.updated_at = _utc_now_iso()


registry = KindJobRegistry()

