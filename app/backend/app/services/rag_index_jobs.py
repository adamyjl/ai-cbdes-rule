from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class IndexJob:
    job_id: str
    root_dir: str
    enrich: bool
    max_functions: int | None

    stage: str
    started_at: str
    updated_at: str

    total_files: int
    processed_files: int
    current_file: str | None

    total_functions: int
    processed_functions: int

    total_embeddings: int
    processed_embeddings: int

    error: str | None
    canceled: bool

    _cancel_event: threading.Event

    def to_dict(self) -> dict[str, Any]:
        if self.stage == 'scanning':
            total = self.total_files
            done = self.processed_files
        elif self.stage == 'enriching':
            total = self.total_functions
            done = self.processed_functions
        elif self.stage == 'embedding':
            total = self.total_embeddings
            done = self.processed_embeddings
        elif self.stage == 'done':
            total = 1
            done = 1
        else:
            total = 0
            done = 0
        pct = (done / total * 100.0) if total > 0 else 0.0
        return {
            'job_id': self.job_id,
            'root_dir': self.root_dir,
            'enrich': bool(self.enrich),
            'max_functions': self.max_functions,
            'stage': self.stage,
            'started_at': self.started_at,
            'updated_at': self.updated_at,
            'total_files': self.total_files,
            'processed_files': self.processed_files,
            'current_file': self.current_file,
            'total_functions': self.total_functions,
            'processed_functions': self.processed_functions,
            'total_embeddings': self.total_embeddings,
            'processed_embeddings': self.processed_embeddings,
            'percent': pct,
            'error': self.error,
            'canceled': bool(self.canceled),
        }


class IndexJobRegistry:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: dict[str, IndexJob] = {}

    def create(self, *, root_dir: str, enrich: bool, max_functions: int | None) -> IndexJob:
        with self._lock:
            job_id = str(uuid4())
            job = IndexJob(
                job_id=job_id,
                root_dir=root_dir,
                enrich=bool(enrich),
                max_functions=max_functions,
                stage='queued',
                started_at=_utc_now_iso(),
                updated_at=_utc_now_iso(),
                total_files=0,
                processed_files=0,
                current_file=None,
                total_functions=0,
                processed_functions=0,
                total_embeddings=0,
                processed_embeddings=0,
                error=None,
                canceled=False,
                _cancel_event=threading.Event(),
            )
            self._jobs[job_id] = job
            return job

    def get(self, job_id: str) -> IndexJob | None:
        with self._lock:
            return self._jobs.get(job_id)

    def cancel(self, job_id: str) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            job._cancel_event.set()
            job.canceled = True
            job.updated_at = _utc_now_iso()
            if job.stage not in {'done', 'error'}:
                job.stage = 'canceled'
            return True

    def touch(self, job: IndexJob, **fields: Any) -> None:
        with self._lock:
            for k, v in fields.items():
                if hasattr(job, k):
                    setattr(job, k, v)
            job.updated_at = _utc_now_iso()


registry = IndexJobRegistry()
