from __future__ import annotations

import os
from pathlib import Path


def get_repo_root() -> Path:
    here = Path(__file__).resolve()
    return here.parents[3]


def get_default_rag_root() -> str:
    override = os.environ.get('AI_CBDES_DEFAULT_RAG_ROOT')
    if override:
        return str(Path(override).expanduser().resolve())
    return str((get_repo_root() / 'data' / 'THICV-Pilot_master').resolve())


def is_auto_index_enabled() -> bool:
    v = os.environ.get('AI_CBDES_AUTO_INDEX', '1').strip().lower()
    return v not in {'0', 'false', 'no'}

