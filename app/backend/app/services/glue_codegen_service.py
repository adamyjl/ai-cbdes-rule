from __future__ import annotations

import json
import re

from backend.app.services.llm_policy import llm_call
from backend.app.services.openai_client import get_chat_model, get_openai_client


def _loads_json_relaxed(text: str) -> dict:
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else {}
    except Exception:
        m = re.search(r'\{[\s\S]*\}', text)
        if not m:
            return {}
        try:
            obj = json.loads(m.group(0))
            return obj if isinstance(obj, dict) else {}
        except Exception:
            return {}


class GlueCodegenService:
    def generate_glue(self, *, task: str, from_node: dict, to_node: dict) -> dict:
        client = get_openai_client()
        model = get_chat_model()
        prompt = {
            'task': '你是智能驾驶基础软件的胶水代码生成器。请根据上下游节点的输入输出规范，生成一个中间转换节点的胶水代码。',
            'constraints': {
                'output_json_only': True,
                'language': 'zh',
            },
            'input': {
                'task_context': task,
                'from_node': from_node,
                'to_node': to_node,
            },
            'output_schema': {
                'glue_name': 'string',
                'doc_zh': 'string',
                'inputs_json': 'json_object',
                'outputs_json': 'json_object',
                'glue_code': 'string',
            },
            'notes': (
                'glue_code 输出为一段可读的 Python 或 TypeScript 函数，实现从 inputs_json 到 outputs_json 的字段映射与必要的类型转换；'
                '当无法严格转换时，保留原始字段并在代码中标注 TODO；inputs_json/outputs_json 为 JSON 对象；'
                '不要输出任何解释，只输出 JSON。'
            ),
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
        return {
            'glue_name': str(obj.get('glue_name') or '格式转换胶水'),
            'doc_zh': str(obj.get('doc_zh') or '').strip(),
            'inputs_json': obj.get('inputs_json') if isinstance(obj.get('inputs_json'), (dict, list)) else {},
            'outputs_json': obj.get('outputs_json') if isinstance(obj.get('outputs_json'), (dict, list)) else {},
            'glue_code': str(obj.get('glue_code') or ''),
        }

