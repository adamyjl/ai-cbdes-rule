from __future__ import annotations

import json
import re

from backend.app.services.openai_client import get_chat_model, get_openai_client
from backend.app.services.llm_policy import llm_call


_modules = [
    'common',
    'perception',
    'prediction',
    'planning',
    'control',
    'decision',
    'learning',
    'evaluation',
    'localization',
]

_kinds = ['node', 'glue', 'platform']


def _line_count(code: str) -> int:
    try:
        return int(code.count('\n') + 1) if code else 0
    except Exception:
        return 0


def _looks_like_coordinate_transform(*, file_path: str, signature: str, code: str) -> bool:
    joined = f"{file_path} {signature}".lower()
    if any(
        k in joined
        for k in (
            'coord',
            'coordinate',
            'wgs84',
            'utm',
            'ecef',
            'enu',
            'ned',
            'geodetic',
            'lat',
            'lon',
            'yaw',
            'pitch',
            'roll',
            'quaternion',
            'euler',
            'rotation',
            'transform',
        )
    ):
        return True

    c = (code or '').lower()
    if re.search(r'\b(lat|lon|utm|enu|ned|ecef|wgs84|yaw|pitch|roll|quaternion)\b', c):
        return True

    if any(k in c for k in ('sin(', 'cos(', 'atan2(', 'sqrt(', 'matrix', 'quaternion', 'euler')):
        return True

    return False


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


def _guess_kind(*, file_path: str, signature: str, code: str) -> str:
    s = (signature or '').lower()
    p = (file_path or '').lower()
    joined = f'{p} {s}'

    if any(k in joined for k in ('log', 'logger', 'clock', 'time', 'config', 'auth', 'acl', 'storage', 'monitor', 'metric', 'telemetry')):
        return 'platform'

    lc = _line_count(code)
    if lc > 20:
        return 'node'

    if _looks_like_coordinate_transform(file_path=file_path, signature=signature, code=code):
        return 'node'

    if any(
        k in joined
        for k in (
            'encode',
            'decode',
            'serializer',
            'deserialize',
            'format',
            'convert',
            'transform',
            'map',
            'mapping',
            'throttle',
            'rate',
            'timeout',
            'retry',
            'default',
            'pack',
            'unpack',
            'addr',
            'address',
            'uri',
        )
    ):
        return 'glue'

    if _guess_module_from_path(file_path) in {'perception', 'prediction', 'planning', 'control', 'decision', 'learning', 'evaluation'}:
        return 'node'

    return 'glue'


def classify_function_kind(*, file_path: str, signature: str, code: str) -> str:
    client = get_openai_client()
    model = get_chat_model()

    lc = _line_count(code)
    fallback_kind = _guess_kind(file_path=file_path, signature=signature, code=code)
    coord = _looks_like_coordinate_transform(file_path=file_path, signature=signature, code=code)

    prompt = {
        'task': '你是智能驾驶基础软件的代码分析助手，请给出该函数的类别 kind。',
        'kinds': _kinds,
        'definitions': {
            'node': '必须节点化（算法/关键业务）：感知/预测/规划/控制/策略决策/学习模型/评测等核心逻辑；包括复杂数学/坐标转换/轨迹/控制相关。',
            'glue': '默认属性化（工程胶水）：非常轻量的工程胶水/字段映射/简单编码解码/简单单位转换/简单节流超时重试/默认值填充；原则：通常不超过 20 行，且不包含复杂数学/坐标系推导。',
            'platform': '默认平台化（基础设施）：日志/时钟/配置/鉴权/存储/监控/通用地址解析等。',
        },
        'input': {
            'file_path': file_path,
            'signature': signature,
            'line_count': lc,
            'has_coordinate_transform_signals': bool(coord),
            'code': (code or '')[:12000],
        },
        'output_schema': {'kind': 'one_of_kinds'},
        'constraints': {
            'output_json_only': True,
        },
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

    kind = str(obj.get('kind') or '').strip()
    if kind not in _kinds:
        kind = fallback_kind

    if kind == 'glue' and (lc > 20 or coord):
        kind = 'node'
    return kind


def enrich_function(*, file_path: str, signature: str, code: str) -> dict[str, str]:
    client = get_openai_client()
    model = get_chat_model()
    fallback_module = _guess_module_from_path(file_path)
    fallback_kind = _guess_kind(file_path=file_path, signature=signature, code=code)
    lc = _line_count(code)
    coord = _looks_like_coordinate_transform(file_path=file_path, signature=signature, code=code)

    prompt = {
        'task': '你是智能驾驶基础软件的代码分析助手，请为函数生成可检索的结构化档案。',
        'constraints': {
            'modules': _modules,
            'kinds': _kinds,
            'language': 'auto',
            'output_json_only': True,
        },
        'input': {
            'file_path': file_path,
            'signature': signature,
            'line_count': lc,
            'has_coordinate_transform_signals': bool(coord),
            'code': code[:12000],
        },
        'output_schema': {
            'display_name': 'string',
            'module': 'one_of_modules',
            'kind': 'one_of_kinds',
            'doc_zh': 'string',
            'doc_en': 'string',
            'inputs_json': 'json_object',
            'outputs_json': 'json_object',
        },
        'notes': (
            'display_name 以“动词+对象+约束”命名；doc_zh 用 1-3 句中文，doc_en 用 1-3 句英文；'
            'inputs_json/outputs_json 为 JSON 对象，用于描述输入/输出字段，建议结构：'
            '{"fields":[{"name":"","type":"","desc":""}]}；无法判断时输出 {}。'
            'kind 分类规则：glue 只用于非常轻量的工程胶水（通常不超过 20 行、无复杂数学/坐标系推导）；'
            '坐标转换/姿态旋转/矩阵计算等更偏核心算法，倾向 node；平台基础设施倾向 platform。'
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

    kind = str(obj.get('kind') or '').strip()
    if kind not in _kinds:
        kind = fallback_kind

    if kind == 'glue' and (lc > 20 or coord):
        kind = 'node'
    doc_zh = str(obj.get('doc_zh') or '').strip()
    doc_en = str(obj.get('doc_en') or '').strip()
    inputs_json = _safe_json_dump(obj.get('inputs_json'))
    outputs_json = _safe_json_dump(obj.get('outputs_json'))
    return {
        'display_name': display_name,
        'module': module,
        'kind': kind,
        'doc_zh': doc_zh,
        'doc_en': doc_en,
        'inputs_json': inputs_json,
        'outputs_json': outputs_json,
    }
