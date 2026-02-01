from __future__ import annotations

import json
import re

from backend.app.services.llm_policy import llm_call
from backend.app.services.openai_client import get_chat_model, get_openai_client
from backend.app.services.rag_store import RagStore


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


def _clean_items(items: object, *, limit: int = 30) -> list[str]:
    out: list[str] = []
    if isinstance(items, list):
        for it in items:
            s = str(it or '').strip()
            if not s:
                continue
            if s not in out:
                out.append(s)
            if len(out) >= limit:
                break
    return out


class CotService:
    def __init__(self) -> None:
        self._store = RagStore()

    def make_question(
        self,
        *,
        mode: str,
        item: str,
        goal: str,
        constraints: str,
        subtasks: str,
        risk_items: list[str],
        missing_items: list[str],
    ) -> str:
        mode = (mode or '').strip().lower()
        item = (item or '').strip()
        prompt = {
            'task': '你是智能驾驶代码生产线的路由消歧助手。请针对单条风险/歧义或缺失信息，生成一句最关键、最具体的澄清问题。',
            'mode': mode,
            'item': item,
            'context': {
                'goal': goal,
                'constraints': constraints,
                'subtasks': subtasks,
                'risk_items': risk_items,
                'missing_items': missing_items,
            },
            'output_schema': {
                'question': 'string',
            },
            'rules': [
                '只输出 JSON',
                'question 必须是一个中文问句，包含明确的填空点（如频率/坐标系/topic/目录/性能等）',
                '避免泛泛而谈，避免多问句',
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
                    {'role': 'user', 'content': json.dumps(prompt, ensure_ascii=False)},
                ],
                extra_body={'enable_thinking': False},
            )
        )
        text = (res.choices[0].message.content or '').strip()
        obj = _parse_json(text)
        q = str(obj.get('question') or '').strip()
        if not q:
            return f"请补充：{item}（给出具体参数/范围/示例）？"
        return q

    def refine_with_answer(
        self,
        *,
        mode: str,
        item: str,
        answer: str,
        goal: str,
        constraints: str,
        subtasks: str,
        risk_items: list[str],
        missing_items: list[str],
    ) -> dict:
        mode = (mode or '').strip().lower()
        item = (item or '').strip()
        answer = (answer or '').strip()

        prompt = {
            'task': '你是智能驾驶代码生产线的路由消歧助手。根据用户对单条问题的回答，更新任务目标/关键约束/子任务，并更新风险与缺失列表。',
            'mode': mode,
            'current_item': item,
            'user_answer': answer,
            'state': {
                'goal': goal,
                'constraints': constraints,
                'subtasks': subtasks,
                'risk_items': risk_items,
                'missing_items': missing_items,
            },
            'output_schema': {
                'resolved': 'boolean (该条是否已解决，已解决则应从对应列表移除)',
                'goal': 'string',
                'constraints': 'string',
                'subtasks': 'string',
                'risk_items': 'string[]',
                'missing_items': 'string[]',
            },
            'rules': [
                '只输出 JSON',
                '若该条已解决，将 resolved=true 且从对应列表移除',
                '若出现新的风险/歧义或新的缺失项，追加到列表末尾',
                '列表项要简短、可执行、可提问',
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
                    {'role': 'user', 'content': json.dumps(prompt, ensure_ascii=False)},
                ],
                extra_body={'enable_thinking': False},
            )
        )
        text = (res.choices[0].message.content or '').strip()
        obj = _parse_json(text)

        resolved = bool(obj.get('resolved'))
        next_goal = str(obj.get('goal') or goal or '').strip()
        next_constraints = str(obj.get('constraints') or constraints or '').strip()
        next_subtasks = str(obj.get('subtasks') or subtasks or '').strip()

        next_risks = _clean_items(obj.get('risk_items') if isinstance(obj, dict) else None)
        next_missing = _clean_items(obj.get('missing_items') if isinstance(obj, dict) else None)

        if not next_risks:
            next_risks = _clean_items(risk_items)
        if not next_missing:
            next_missing = _clean_items(missing_items)

        if resolved:
            if mode == 'risk':
                next_risks = [x for x in next_risks if x != item]
            elif mode == 'missing':
                next_missing = [x for x in next_missing if x != item]

        return {
            'resolved': resolved,
            'goal': next_goal,
            'constraints': next_constraints,
            'subtasks': next_subtasks,
            'risk_items': next_risks,
            'missing_items': next_missing,
        }

    def build_final_prompt(
        self,
        *,
        goal: str,
        constraints: str,
        subtasks: str,
        related_function_ids: list[str],
    ) -> dict:
        used: list[str] = []
        fn_meta: list[dict] = []
        fn_sources: list[str] = []

        seen: set[str] = set()
        for fid in [str(x).strip() for x in (related_function_ids or []) if str(x).strip()]:
            if fid in seen:
                continue
            seen.add(fid)
            fn = self._store.get_function(fid)
            if not fn:
                continue
            used.append(fid)

            file_path = str(fn.get('file_path') or '')
            signature = str(fn.get('signature') or '')
            module = str(fn.get('module') or '')
            display_name = str(fn.get('display_name') or fn.get('name') or '')
            inputs_json = str(fn.get('inputs_json') or '{}')
            outputs_json = str(fn.get('outputs_json') or '{}')
            code = str(fn.get('code') or '')

            fn_meta.append(
                {
                    'function_id': fid,
                    'display_name': display_name,
                    'module': module,
                    'file_path': file_path,
                    'signature': signature,
                    'inputs_json': inputs_json,
                    'outputs_json': outputs_json,
                    'doc_zh': fn.get('doc_zh') or '',
                }
            )

            ext = (file_path.rsplit('.', 1)[-1].lower() if '.' in file_path else '')
            lang = {
                'py': 'python',
                'ts': 'typescript',
                'tsx': 'tsx',
                'js': 'javascript',
                'jsx': 'jsx',
                'cc': 'cpp',
                'cpp': 'cpp',
                'cxx': 'cpp',
                'c': 'c',
                'h': 'cpp',
                'hpp': 'cpp',
            }.get(ext, '')

            header = f"### {display_name or fid}\n- function_id: {fid}\n- module: {module or '-'}\n- file_path: {file_path or '-'}\n- signature: {signature or '-'}\n- inputs: {inputs_json}\n- outputs: {outputs_json}".strip()
            block = f"```{lang}\n{code}\n```" if lang else f"```\n{code}\n```"
            fn_sources.append(f"{header}\n\n{block}")

            if len(used) >= 25:
                break

        prompt = {
            'task': '你是智能驾驶代码生产线的提示词工程师。基于消歧后的信息，输出“最准确、可直接用于代码生成”的中文提示词。注意：不要在 prompt 中省略约束，也不要输出任何密钥。',
            'input': {
                'goal': goal,
                'constraints': constraints,
                'subtasks': subtasks,
                'related_functions_meta': fn_meta,
                'note': '相关函数源码会由系统在最终提示词末尾以“附录”形式完整粘贴，你只需在 prompt 正文中明确引用并说明如何利用。'
            },
            'output_schema': {
                'prompt_main': 'string (不需要包含源码，源码由系统追加)',
            },
            'rules': [
                '只输出 JSON',
                'prompt_main 必须包含：任务目标、输入/输出约束、边界条件、验收标准、实现步骤/子任务拆分、与附录源码的关联指引',
                '不要包含“风险点/歧义点/缺失信息清单”内容',
                '避免输出任何密钥或环境变量值',
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
                    {'role': 'user', 'content': json.dumps(prompt, ensure_ascii=False)},
                ],
                extra_body={'enable_thinking': False},
            )
        )
        text = (res.choices[0].message.content or '').strip()
        obj = _parse_json(text)
        out_main = str(obj.get('prompt_main') or '').strip()
        if not out_main:
            out_main = (
                f"# 任务目标\n{goal}\n\n# 关键约束（输入/输出）\n{constraints}\n\n# 建议拆分的子任务\n{subtasks}\n\n"
                "# 相关源码使用说明\n- 参考下方附录中的相关函数源码，优先复用现有实现与数据结构；在修改前说明影响范围与回归测试。"
            ).strip()

        appendix = "\n\n---\n\n## 附录：推荐关联模块/函数源码（完整粘贴）\n" + ("\n\n".join(fn_sources) if fn_sources else "(无)")
        return {'prompt': (out_main + appendix).strip(), 'used_function_ids': used}
