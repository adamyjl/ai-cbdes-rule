from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import urllib.parse
import urllib.request


def _post_json(url: str, payload: dict, *, timeout_s: int = 180) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        raw = resp.read().decode('utf-8')
    return json.loads(raw)


def _get_json(url: str, *, timeout_s: int = 30) -> object:
    with urllib.request.urlopen(url, timeout=timeout_s) as resp:
        raw = resp.read().decode('utf-8')
    return json.loads(raw)


def _has_code_fence(s: str) -> bool:
    s = (s or '').strip()
    return ('```cpp' in s) or ('```c++' in s) or ('```c' in s)


def main() -> int:
    if len(sys.argv) < 2:
        print('usage: python scripts/selftest_page_orchestration_flow.py <prompt_file>')
        return 2

    prompt_file = Path(sys.argv[1]).resolve()
    prompt = prompt_file.read_text(encoding='utf-8')

    base = 'http://127.0.0.1:8000'
    gen = _post_json(f'{base}/orchestrator/generate', {'prompt': prompt})
    if not gen.get('ok'):
        raise SystemExit(1)

    code = str(gen.get('result') or '')
    log = str(gen.get('log') or '')
    key_points = gen.get('key_points') if isinstance(gen.get('key_points'), list) else []
    ok_codegen = _has_code_fence(code)

    archived = _post_json(
        f'{base}/archive/events',
        {
            'type': 'orchestrator.generate',
            'payload': {
                'source_event': None,
                'prompt': prompt,
                'code': code,
                'log': log,
                'key_points': key_points,
            },
        },
    )
    ev_id = str(archived.get('id') or '')

    q = urllib.parse.urlencode({'limit': '1'})
    latest = _get_json(f'{base}/archive/events?{q}')
    latest_ev = latest[0] if isinstance(latest, list) and latest else None
    latest_payload = (latest_ev or {}).get('payload') if isinstance(latest_ev, dict) else None
    latest_code = str((latest_payload or {}).get('code') or '') if isinstance(latest_payload, dict) else ''

    ok_archive = bool(ev_id) and _has_code_fence(latest_code)

    out = {
        'ok': ok_codegen and ok_archive,
        'ts': datetime.now(timezone.utc).isoformat(),
        'code_has_fence': ok_codegen,
        'archive_latest_has_fence': ok_archive,
        'archived_event_id': ev_id,
        'result_preview': code[:500],
    }

    out_path = Path(__file__).resolve().parents[1] / '.logs' / 'selftest_page_orchestration_flow.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())

