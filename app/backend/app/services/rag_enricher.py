from __future__ import annotations

import json
import re

from backend.app.services.openai_client import get_chat_model, get_openai_client
from backend.app.services.llm_policy import llm_call


_modules = ['common', 'perception', 'planning', 'decision', 'localization', 'control']


def _safe_json_dump(v: object) -> str:
    if v is None:
        return '{}'
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return '{}'
        try:
            obj = json.loads(s)
            return json.dumps(obj, ensure_ascii=False)
        except Exception:
            return '{}'
    if isinstance(v, (dict, list)):
        try:
            return json.dumps(v, ensure_ascii=False)
        except Exception:
            return '{}'
    return '{}'


def _fix_invalid_json_escapes(s: str) -> str:
    out: list[str] = []
    in_str = False
    i = 0
    while i < len(s):
        ch = s[i]
        if not in_str:
            if ch == '"':
                in_str = True
            out.append(ch)
            i += 1
            continue

        if ch == '"':
            in_str = False
            out.append(ch)
            i += 1
            continue

        if ch != '\\':
            out.append(ch)
            i += 1
            continue

        if i + 1 >= len(s):
            out.append('\\\\')
            i += 1
            continue

        nxt = s[i + 1]
        if nxt in {'"', '\\', '/', 'b', 'f', 'n', 'r', 't'}:
            out.append('\\')
            out.append(nxt)
            i += 2
            continue

        if nxt == 'u' and i + 5 < len(s):
            hexpart = s[i + 2 : i + 6]
            if re.fullmatch(r'[0-9a-fA-F]{4}', hexpart):
                out.append('\\')
                out.append('u')
                out.append(hexpart)
                i += 6
                continue

        out.append('\\\\')
        i += 1

    return ''.join(out)


def _loads_json_relaxed(text: str) -> dict:
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else {}
    except Exception:
        m = re.search(r'\{[\s\S]*\}', text)
        if not m:
            return {}
        candidate = m.group(0)
        try:
            obj = json.loads(candidate)
            return obj if isinstance(obj, dict) else {}
        except Exception:
            try:
                fixed = _fix_invalid_json_escapes(candidate)
                obj = json.loads(fixed)
                return obj if isinstance(obj, dict) else {}
            except Exception:
                return {}


def _guess_module_from_path(file_path: str) -> str:
    p = file_path.lower()
    if any(k in p for k in ('perception', 'percep', 'detect', 'lidar', 'camera', 'fusion')):
        return 'perception'
    if any(k in p for k in ('planning', 'plan', 'trajectory', 'traj', 'speed')):
        return 'planning'
    if any(k in p for k in ('decision', 'behavior', 'fsm', 'policy')):
        return 'decision'
    if any(k in p for k in ('localization', 'localize', 'slam', 'map', 'gnss', 'imu')):
        return 'localization'
    if any(k in p for k in ('control', 'controller', 'pid', 'mpc', 'actuator')):
        return 'control'
    return 'common'


def enrich_function(*, file_path: str, signature: str, code: str) -> dict[str, str]:
    client = get_openai_client()
    model = get_chat_model()
    fallback_module = _guess_module_from_path(file_path)

    prompt = {
        'task': '你是智能驾驶基础软件的代码分析助手，请为函数生成可检索的结构化档案。',
        'constraints': {
            'modules': _modules,
            'language': 'auto',
            'output_json_only': True,
        },
        'input': {
            'file_path': file_path,
            'signature': signature,
            'code': code[:12000],
        },
        'output_schema': {
            'display_name': 'string',
            'module': 'one_of_modules',
            'doc_zh': 'string',
            'doc_en': 'string',
            'inputs_json': 'json_object',
            'outputs_json': 'json_object',
        },
        'notes': (
            'display_name 以“动词+对象+约束”命名；doc_zh 用 1-3 句中文，doc_en 用 1-3 句英文；'
            'inputs_json/outputs_json 为 JSON 对象，用于描述输入/输出字段，建议结构：'
            '{"fields":[{"name":"","type":"","desc":""}]}；无法判断时输出 {}。'
        )
    }

    res = llm_call(
        lambda: client.chat.completions.create(
            model=model,
            temperature=0,
            messages=[
                {'role': 'system', 'content': '只输出 JSON，不要输出其它内容。'},
                {'role': 'user', 'content': json.dumps(prompt, ensure_ascii=False)},
            ],
            extra_body={'enable_thinking': False},
        )
    )
    text = (res.choices[0].message.content or '').strip()
    obj = _loads_json_relaxed(text)

    display_name = str(obj.get('display_name') or '').strip() or signature
    module = str(obj.get('module') or '').strip()
    if module not in _modules:
        module = fallback_module
    doc_zh = str(obj.get('doc_zh') or '').strip()
    doc_en = str(obj.get('doc_en') or '').strip()
    inputs_json = _safe_json_dump(obj.get('inputs_json'))
    outputs_json = _safe_json_dump(obj.get('outputs_json'))
    return {
        'display_name': display_name,
        'module': module,
        'doc_zh': doc_zh,
        'doc_en': doc_en,
        'inputs_json': inputs_json,
        'outputs_json': outputs_json,
    }
