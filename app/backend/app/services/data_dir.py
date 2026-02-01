from __future__ import annotations

import os
from pathlib import Path


def get_data_dir() -> Path:
    configured = os.environ.get('AI_CBDES_DATA_DIR')
    if configured:
        return Path(configured).expanduser().resolve()

    local = os.environ.get('LOCALAPPDATA')
    if local:
        return (Path(local) / 'ai-cbdes-rule' / 'data').resolve()

    return (Path.home() / '.local' / 'share' / 'ai-cbdes-rule').resolve()

