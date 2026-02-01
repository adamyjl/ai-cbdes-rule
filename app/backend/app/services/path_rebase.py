from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RebaseResult:
    updated: int
    scanned: int


def _normalize_sep(p: str) -> str:
    return p.replace('/', '\\')


def rebase_file_path(file_path: str, *, app_dir: Path, data_dir: Path) -> str:
    raw = _normalize_sep(str(file_path))
    lower = raw.lower()

    thicv_marker = '\\data\\thicv-pilot_master\\'
    idx = lower.find(thicv_marker)
    if idx >= 0:
        suffix = raw[idx + len(thicv_marker) :]
        candidate = app_dir / 'data' / 'THICV-Pilot_master' / suffix
        return str(candidate)

    backend_marker = '\\backend\\app\\'
    idx = lower.find(backend_marker)
    if idx >= 0:
        suffix = raw[idx + len(backend_marker) :]
        candidate = app_dir / 'backend' / 'app' / suffix
        return str(candidate)

    release_marker = '\\data\\release_sources\\'
    idx = lower.find(release_marker)
    if idx >= 0:
        suffix = raw[idx + len(release_marker) :]
        candidate = data_dir / 'release_sources' / suffix
        return str(candidate)

    return raw


def get_app_dir() -> Path:
    return Path(__file__).resolve().parents[3]

