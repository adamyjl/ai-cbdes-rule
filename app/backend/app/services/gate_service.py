from __future__ import annotations

import json
import os
import re
import subprocess
import threading
from datetime import datetime, timezone
from pathlib import Path

from backend.app.services.gate_jobs import GateJob, registry
from backend.app.services.gate_workspace import create_workspace, ensure_gate_scaffold, materialize_generated_result
from backend.app.services.llm_policy import llm_call
from backend.app.services.openai_client import get_chat_model, get_openai_client


def _parse_json(text: str) -> dict:
    text = (text or '').strip()
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r'\{[\s\S]*\}', text)
        if not m:
            return {}
        try:
            return json.loads(m.group(0))
        except Exception:
            return {}


def _run_command(job: GateJob, *, step: str, command: str) -> int:
    registry.append_log(job, f"[{step}] $ {command}")
    proc = subprocess.Popen(
        command,
        cwd=job.work_dir,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=False,
        env={**os.environ},
    )
    assert proc.stdout is not None

    def decode_line(b: bytes) -> str:
        try:
            return b.decode('utf-8')
        except Exception:
            try:
                return b.decode('gbk', errors='replace')
            except Exception:
                return b.decode('latin-1', errors='replace')

    for raw in iter(proc.stdout.readline, b''):
        if job._cancel_event.is_set():
            try:
                proc.kill()
            except Exception:
                pass
            registry.append_log(job, f"[{step}] canceled")
            return 1
        line = decode_line(raw).rstrip('\r\n')
        registry.append_log(job, f"[{step}] {line}".rstrip())
    code = proc.wait()
    registry.append_log(job, f"[{step}] exit_code={code}")
    return int(code)


def _generate_test_scripts(job: GateJob, *, mode: str) -> dict:
    payload = {
        'task': '你是 C/C++ 测试门禁工程师。请为给定需求与生成结果，生成可在本地执行的测试/覆盖率脚本建议。目标是尽可能通用，优先输出“命令串 + 必要文件内容”。',
        'input': {
            'mode': mode,
            'work_dir': job.work_dir,
            'requirement_prompt': job.requirement_prompt,
            'generated_result': job.generated_result,
        },
        'output_schema': {
            'files': [
                {
                    'path': 'string (相对于 work_dir 的相对路径)',
                    'content': 'string (文件内容)',
                }
            ],
            'command': 'string (PowerShell 可执行的一条或多条命令，用 && 或 ; 连接)',
            'notes': 'string (解释与注意事项)',
        },
        'rules': [
            '只输出 JSON',
            '不要输出任何密钥',
            '如果无法确定具体框架，优先生成最小可编译/可运行的单文件测试骨架与命令',
        ],
    }

    client = get_openai_client()
    model = get_chat_model()
    res = llm_call(
        lambda: client.chat.completions.create(
            model=model,
            temperature=0,
            messages=[
                {'role': 'system', 'content': '输出 JSON。不要输出其它内容。'},
                {'role': 'user', 'content': json.dumps(payload, ensure_ascii=False)},
            ],
            extra_body={'enable_thinking': False},
        )
    )
    text = (res.choices[0].message.content or '').strip()
    return _parse_json(text)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class GateService:
    def start(self, job: GateJob) -> None:
        t = threading.Thread(target=self._run, args=(job,), daemon=True)
        t.start()

    def _prepare_workspace(self, job: GateJob) -> None:
        wd = (job.work_dir or '').strip()
        auto = (not wd) or wd.upper() == 'AUTO' or wd == 'D:\\Code'
        root: Path
        if auto:
            root = create_workspace(name_hint=f'gate_{job.job_id[:8]}')
            registry.update(job, work_dir=str(root))
        else:
            root = Path(wd).expanduser().resolve()
            root.mkdir(parents=True, exist_ok=True)

        marker = root / '.gate_manifest.json'
        if not marker.exists():
            try:
                materialize_generated_result(work_dir=root, generated_result=job.generated_result)
            except Exception as e:
                registry.append_log(job, f"[prepare] materialize_failed: {str(e) or type(e).__name__}")
        try:
            ensure_gate_scaffold(root=root)
        except Exception as e:
            registry.append_log(job, f"[prepare] ensure_scaffold_failed: {str(e) or type(e).__name__}")

        cc = (job.compile_command or '').strip()
        sc = (job.static_command or '').strip()
        if (not cc) or cc.upper() == 'AUTO':
            registry.update(job, compile_command='powershell -NoProfile -ExecutionPolicy Bypass -File gate_compile.ps1')
        if (not sc) or sc.upper() == 'AUTO':
            registry.update(job, static_command='powershell -NoProfile -ExecutionPolicy Bypass -File gate_static.ps1')

        if (root / 'gate_unit.ps1').exists():
            registry.update(job, requirement_prompt=(job.requirement_prompt or '').strip())

        registry.append_log(job, f"[prepare] work_dir={job.work_dir}")

    def _run(self, job: GateJob) -> None:
        try:
            self._prepare_workspace(job)
            registry.set_stage(job, 'compile')
            registry.touch_step(job, 'compile', status='running', started_at=_utc_now_iso(), finished_at=None)
            code = _run_command(job, step='compile', command=job.compile_command)
            registry.touch_step(job, 'compile', status='success' if code == 0 else 'failed', finished_at=_utc_now_iso())
            if code != 0:
                registry.set_error(job, 'compile_failed')
                return

            if job._cancel_event.is_set():
                registry.set_stage(job, 'canceled')
                registry.set_done(job)
                return

            registry.set_stage(job, 'static')
            registry.touch_step(job, 'static', status='running', started_at=_utc_now_iso(), finished_at=None)
            code = _run_command(job, step='static', command=job.static_command)
            registry.touch_step(job, 'static', status='success' if code == 0 else 'failed', finished_at=_utc_now_iso())
            if code != 0:
                registry.set_error(job, 'static_failed')
                return

            if job.enable_unit:
                if job._cancel_event.is_set():
                    registry.set_stage(job, 'canceled')
                    registry.set_done(job)
                    return
                registry.set_stage(job, 'unit')
                registry.touch_step(job, 'unit', status='running', started_at=_utc_now_iso(), finished_at=None)
                gate_unit = os.path.join(job.work_dir, 'gate_unit.ps1')
                if os.path.exists(gate_unit):
                    code = _run_command(job, step='unit', command='powershell -NoProfile -ExecutionPolicy Bypass -File gate_unit.ps1')
                else:
                    obj = _generate_test_scripts(job, mode='unit')
                    files = obj.get('files') if isinstance(obj.get('files'), list) else []
                    for f in files:
                        try:
                            rel = str((f or {}).get('path') or '').strip()
                            if not rel or rel.startswith(('..', '/', '\\')):
                                continue
                            p = os.path.join(job.work_dir, rel)
                            os.makedirs(os.path.dirname(p), exist_ok=True)
                            with open(p, 'w', encoding='utf-8') as w:
                                w.write(str((f or {}).get('content') or ''))
                        except Exception:
                            continue
                    cmd = str(obj.get('command') or '').strip()
                    if not cmd:
                        cmd = 'echo unit_test_command_missing'
                    registry.append_log(job, f"[unit] notes: {str(obj.get('notes') or '').strip()}".rstrip())
                    code = _run_command(job, step='unit', command=cmd)
                registry.touch_step(job, 'unit', status='success' if code == 0 else 'failed', finished_at=_utc_now_iso())
                if code != 0:
                    registry.set_error(job, 'unit_failed')
                    return

            if job.enable_coverage:
                if job._cancel_event.is_set():
                    registry.set_stage(job, 'canceled')
                    registry.set_done(job)
                    return
                registry.set_stage(job, 'coverage')
                registry.touch_step(job, 'coverage', status='running', started_at=_utc_now_iso(), finished_at=None)
                gate_cov = os.path.join(job.work_dir, 'gate_coverage.ps1')
                if os.path.exists(gate_cov):
                    code = _run_command(job, step='coverage', command='powershell -NoProfile -ExecutionPolicy Bypass -File gate_coverage.ps1')
                else:
                    obj = _generate_test_scripts(job, mode='coverage')
                    files = obj.get('files') if isinstance(obj.get('files'), list) else []
                    for f in files:
                        try:
                            rel = str((f or {}).get('path') or '').strip()
                            if not rel or rel.startswith(('..', '/', '\\')):
                                continue
                            p = os.path.join(job.work_dir, rel)
                            os.makedirs(os.path.dirname(p), exist_ok=True)
                            with open(p, 'w', encoding='utf-8') as w:
                                w.write(str((f or {}).get('content') or ''))
                        except Exception:
                            continue
                    cmd = str(obj.get('command') or '').strip()
                    if not cmd:
                        cmd = 'echo coverage_command_missing'
                    registry.append_log(job, f"[coverage] notes: {str(obj.get('notes') or '').strip()}".rstrip())
                    code = _run_command(job, step='coverage', command=cmd)
                registry.touch_step(job, 'coverage', status='success' if code == 0 else 'failed', finished_at=_utc_now_iso())
                if code != 0:
                    registry.set_error(job, 'coverage_failed')
                    return

            registry.set_stage(job, 'done')
            registry.set_done(job)
        except Exception as e:
            registry.set_error(job, str(e) or type(e).__name__)
