from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

repo_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(repo_root))

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

from backend.app.services.archive_service import ArchiveService
from backend.app.services.orchestrator_service import OrchestratorService


def _is_bad_output(code_md: str, prompt: str) -> tuple[bool, str]:
    s = (code_md or '').strip()
    if not s:
        return True, 'empty_code'
    if '```cpp' not in s and '```c++' not in s and '```c' not in s:
        return True, 'missing_code_fence'
    if '【C++代码改写统一规范' in s or '输出 JSON' in s or 'output_schema' in (s.lower()):
        return True, 'looks_like_prompt_or_schema'

    markers = ['# 任务目标', '# 关键约束', '附录：', '相关函数源码']
    if any(m in s for m in markers):
        return True, 'looks_like_prompt_markdown'

    p = (prompt or '').strip()
    if p:
        head = p[:120]
        if head and head in s:
            return True, 'prompt_echo_head'
    return False, 'ok'


def main() -> int:
    out_dir = repo_root / '.logs'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / 'selftest_orchestrator_generate.json'

    archive = ArchiveService()
    events = archive.list_events(limit=200)
    prompt = ''
    picked = None
    for ev in events:
        if str(ev.get('type') or '') != 'orchestrator.generate':
            continue
        payload = ev.get('payload') if isinstance(ev.get('payload'), dict) else {}
        p = str(payload.get('prompt') or '').strip()
        if p:
            prompt = p
            picked = ev
            break

    if not prompt:
        out_path.write_text(
            json.dumps(
                {
                    'ok': False,
                    'error': 'no_orchestrator_generate_prompt_found_in_archive',
                    'data_dir': os.environ.get('AI_CBDES_DATA_DIR') or os.environ.get('LOCALAPPDATA') or '',
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding='utf-8',
        )
        return 3

    svc = OrchestratorService()
    out = svc.generate_cpp_code(prompt=prompt)
    code = str(out.get('code') or '')
    bad, reason = _is_bad_output(code, prompt)

    out_path.write_text(
        json.dumps(
            {
                'ok': not bad,
                'reason': reason,
                'picked_event': {
                    'id': picked.get('id') if isinstance(picked, dict) else None,
                    'type': picked.get('type') if isinstance(picked, dict) else None,
                    'ts': picked.get('ts') if isinstance(picked, dict) else None,
                },
                'ts': datetime.now(timezone.utc).isoformat(),
                'prompt_chars': len(prompt),
                'result': {
                    'code_md': code,
                    'log': out.get('log'),
                    'key_points': out.get('key_points') or [],
                },
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding='utf-8',
    )

    return 0 if not bad else 2


if __name__ == '__main__':
    raise SystemExit(main())
