from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import urllib.request


def _post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = resp.read().decode('utf-8')
    return json.loads(raw)


def _is_bad_output(code_md: str) -> tuple[bool, str]:
    s = (code_md or '').strip()
    if not s:
        return True, 'empty'
    if '```cpp' not in s and '```c++' not in s and '```c' not in s:
        return True, 'no_code_fence'
    bad_markers = [
        '【任务目标】',
        '【功能需求】',
        '【输入输出约束】',
        '【验收标准】',
        '【建议修改点】',
        '【C++代码改写统一规范',
        'output_schema',
        '只输出 JSON',
    ]
    if any(m in s for m in bad_markers):
        return True, 'looks_like_prompt'
    return False, 'ok'


def main() -> int:
    if len(sys.argv) < 2:
        print('usage: python scripts/selftest_orchestrator_http.py <prompt_file>')
        return 2

    prompt_file = Path(sys.argv[1]).resolve()
    prompt = prompt_file.read_text(encoding='utf-8')

    res = _post_json('http://127.0.0.1:8000/orchestrator/generate', {'prompt': prompt})
    code = str(res.get('result') or '')
    log = str(res.get('log') or '')
    key_points = res.get('key_points') or []

    bad, reason = _is_bad_output(code)

    out = {
        'ok': bool(res.get('ok')) and not bad,
        'reason': reason,
        'ts': datetime.now(timezone.utc).isoformat(),
        'http_ok': bool(res.get('ok')),
        'result_preview': code[:600],
        'log_preview': log[:400],
        'key_points_count': len(key_points) if isinstance(key_points, list) else 0,
    }

    out_path = Path(__file__).resolve().parents[1] / '.logs' / 'selftest_orchestrator_http.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(main())

