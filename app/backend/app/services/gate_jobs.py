from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class GateStep:
    step: str
    status: str
    started_at: str | None
    finished_at: str | None


@dataclass
class GateJob:
    job_id: str
    work_dir: str
    compile_command: str
    static_command: str
    enable_unit: bool
    enable_coverage: bool
    requirement_prompt: str
    generated_result: str

    stage: str
    started_at: str
    updated_at: str
    done: bool
    error: str | None
    canceled: bool

    statuses: list[GateStep]
    log_lines: list[str]

    _cancel_event: threading.Event

    def to_dict(self) -> dict[str, Any]:
        return {
            'job_id': self.job_id,
            'work_dir': self.work_dir,
            'stage': self.stage,
            'started_at': self.started_at,
            'updated_at': self.updated_at,
            'done': bool(self.done),
            'error': self.error,
            'canceled': bool(self.canceled),
            'statuses': [
                {
                    'step': s.step,
                    'status': s.status,
                    'started_at': s.started_at,
                    'finished_at': s.finished_at,
                }
                for s in self.statuses
            ],
            'log_lines': list(self.log_lines[-2000:]),
        }


class GateJobRegistry:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: dict[str, GateJob] = {}

    def create(
        self,
        *,
        work_dir: str,
        compile_command: str,
        static_command: str,
        enable_unit: bool,
        enable_coverage: bool,
        requirement_prompt: str,
        generated_result: str,
    ) -> GateJob:
        with self._lock:
            job_id = str(uuid4())
            steps = ['compile', 'static']
            if enable_unit:
                steps.append('unit')
            if enable_coverage:
                steps.append('coverage')
            statuses = [GateStep(step=s, status='queued', started_at=None, finished_at=None) for s in steps]
            job = GateJob(
                job_id=job_id,
                work_dir=work_dir,
                compile_command=compile_command,
                static_command=static_command,
                enable_unit=bool(enable_unit),
                enable_coverage=bool(enable_coverage),
                requirement_prompt=requirement_prompt,
                generated_result=generated_result,
                stage='queued',
                started_at=_utc_now_iso(),
                updated_at=_utc_now_iso(),
                done=False,
                error=None,
                canceled=False,
                statuses=statuses,
                log_lines=[],
                _cancel_event=threading.Event(),
            )
            self._jobs[job_id] = job
            return job

    def get(self, job_id: str) -> GateJob | None:
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
            if not job.done:
                job.stage = 'canceled'
            return True

    def append_log(self, job: GateJob, line: str) -> None:
        with self._lock:
            job.log_lines.append(line)
            if len(job.log_lines) > 5000:
                job.log_lines = job.log_lines[-3000:]
            job.updated_at = _utc_now_iso()

    def set_stage(self, job: GateJob, stage: str) -> None:
        with self._lock:
            job.stage = stage
            job.updated_at = _utc_now_iso()

    def set_error(self, job: GateJob, error: str) -> None:
        with self._lock:
            job.error = error
            job.stage = 'error'
            job.done = True
            now = _utc_now_iso()
            for s in job.statuses:
                if s.status in {'running', 'queued'} and s.finished_at is None:
                    s.status = 'failed'
                    if s.started_at is None:
                        s.started_at = now
                    s.finished_at = now
                    break
            job.updated_at = _utc_now_iso()

    def set_done(self, job: GateJob) -> None:
        with self._lock:
            job.done = True
            if job.stage not in {'error', 'canceled'}:
                job.stage = 'done'
            job.updated_at = _utc_now_iso()

    def touch_step(self, job: GateJob, step: str, **fields: Any) -> None:
        with self._lock:
            for s in job.statuses:
                if s.step == step:
                    for k, v in fields.items():
                        if hasattr(s, k):
                            setattr(s, k, v)
                    break
            job.updated_at = _utc_now_iso()

    def update(self, job: GateJob, **fields: Any) -> None:
        with self._lock:
            for k, v in fields.items():
                if hasattr(job, k):
                    setattr(job, k, v)
            job.updated_at = _utc_now_iso()


registry = GateJobRegistry()
