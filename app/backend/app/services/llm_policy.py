from __future__ import annotations

import os
import random
import threading
import time
from collections import deque
from typing import Callable, TypeVar


T = TypeVar('T')


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except Exception:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, str(default)))
    except Exception:
        return default


class _GlobalRateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._events: deque[float] = deque()
        self._sema = threading.Semaphore(self._max_concurrency())

    def _max_concurrency(self) -> int:
        return max(1, min(_env_int('AI_CBDES_LLM_MAX_CONCURRENCY', 2), 16))

    def _max_per_window(self) -> int:
        return max(1, _env_int('AI_CBDES_LLM_MAX_REQUESTS_PER_MIN', 50))

    def acquire(self) -> None:
        self._sema.acquire()
        try:
            while True:
                now = time.time()
                with self._lock:
                    window = 60.0
                    cutoff = now - window
                    while self._events and self._events[0] < cutoff:
                        self._events.popleft()
                    if len(self._events) < self._max_per_window():
                        self._events.append(now)
                        return
                    oldest = self._events[0]
                sleep_s = max(0.05, oldest + window - now)
                time.sleep(min(sleep_s, 1.0))
        except Exception:
            self._sema.release()
            raise

    def release(self) -> None:
        self._sema.release()


_limiter = _GlobalRateLimiter()


def _is_retryable_error(e: Exception) -> bool:
    status = getattr(e, 'status_code', None)
    if status in {429, 500, 502, 503, 504}:
        return True
    name = type(e).__name__.lower()
    if 'ratelimit' in name or 'rate_limit' in name:
        return True
    if 'timeout' in name or 'temporar' in name:
        return True
    return False


def _retry_after_seconds(e: Exception) -> float | None:
    resp = getattr(e, 'response', None)
    headers = getattr(resp, 'headers', None) if resp is not None else None
    if headers:
        ra = headers.get('retry-after') or headers.get('Retry-After')
        if ra:
            try:
                return float(ra)
            except Exception:
                return None
    return None


def llm_call(fn: Callable[[], T]) -> T:
    max_attempts = max(1, min(_env_int('AI_CBDES_LLM_RETRY_MAX_ATTEMPTS', 8), 20))
    base = max(0.2, _env_float('AI_CBDES_LLM_RETRY_BASE_SECONDS', 1.0))
    cap = max(base, _env_float('AI_CBDES_LLM_RETRY_MAX_SECONDS', 60.0))

    attempt = 0
    while True:
        attempt += 1
        _limiter.acquire()
        try:
            return fn()
        except Exception as e:
            if attempt >= max_attempts or not _is_retryable_error(e):
                raise
            ra = _retry_after_seconds(e)
            if ra is not None and ra > 0:
                sleep_s = min(cap, ra)
            else:
                expo = min(cap, base * (2 ** (attempt - 1)))
                sleep_s = min(cap, expo * (0.5 + random.random()))
            time.sleep(sleep_s)
        finally:
            _limiter.release()

