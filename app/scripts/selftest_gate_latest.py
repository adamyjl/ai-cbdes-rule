from __future__ import annotations

import json
import time
from datetime import datetime, timezone

import urllib.parse
import urllib.request


def _get_json(url: str, *, timeout_s: int = 30) -> object:
    with urllib.request.urlopen(url, timeout=timeout_s) as resp:
        raw = resp.read().decode('utf-8')
    return json.loads(raw)


def _post_json(url: str, payload: dict, *, timeout_s: int = 180) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        raw = resp.read().decode('utf-8')
    return json.loads(raw)


def main() -> int:
    base = 'http://127.0.0.1:8000'
    events = _get_json(f'{base}/archive/events?{urllib.parse.urlencode({"limit": "200"})}')
    picked = None
    if isinstance(events, list):
        for ev in events:
            if isinstance(ev, dict) and str(ev.get('type') or '') == 'orchestrator.generate':
                picked = ev
                break

    if not picked:
        raise SystemExit('no_orchestrator.generate_event')

    payload = picked.get('payload') if isinstance(picked.get('payload'), dict) else {}
    prompt = str(payload.get('prompt') or '').strip()
    code = str(payload.get('code') or payload.get('result') or '').strip()
    if not prompt or not code:
        raise SystemExit('picked_event_missing_prompt_or_code')

    start = _post_json(
        f'{base}/gate/start',
        {
            'work_dir': 'AUTO',
            'compile_command': 'AUTO',
            'static_command': 'AUTO',
            'enable_unit': True,
            'enable_coverage': True,
            'requirement_prompt': prompt,
            'generated_result': code,
            'source_event_id': str(picked.get('id') or ''),
            'source_event_type': 'orchestrator.generate',
        },
        timeout_s=60,
    )
    if not start.get('ok'):
        raise SystemExit(f"start_failed: {start.get('error')}")

    job_id = str(start.get('job_id') or '')
    if not job_id:
        raise SystemExit('missing_job_id')

    deadline = time.time() + 240
    last = None
    while time.time() < deadline:
        job = _get_json(f'{base}/gate/jobs/{urllib.parse.quote(job_id)}')
        if isinstance(job, dict):
            last = job
            if bool(job.get('done')):
                break
        time.sleep(1.2)

    if not isinstance(last, dict):
        raise SystemExit('job_poll_failed')

    out = {
        'ok': bool(last.get('ok')) and bool(last.get('done')) and str(last.get('stage')) in {'done', 'canceled', 'error', 'static', 'unit', 'coverage', 'compile'},
        'ts': datetime.now(timezone.utc).isoformat(),
        'job_id': job_id,
        'stage': last.get('stage'),
        'error': last.get('error'),
        'log_tail': (last.get('log_lines') or [])[-80:],
    }

    from pathlib import Path

    out_path = Path(__file__).resolve().parents[1] / '.logs' / 'selftest_gate_latest.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(out, ensure_ascii=False, indent=2))

    return 0 if (bool(last.get('done')) and str(last.get('stage')) == 'done') else 1


if __name__ == '__main__':
    raise SystemExit(main())

