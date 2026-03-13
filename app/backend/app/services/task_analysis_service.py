from __future__ import annotations

import json
import re

from backend.app.services.llm_policy import llm_call
from backend.app.services.openai_client import get_chat_model, get_openai_client
from backend.app.services.rag_service import RagService
from backend.app.services.rag_store import RagStore


class TaskAnalysisService:
    def __init__(self) -> None:
        self._rag = RagService()
        self._store = RagStore()

    def analyze(
        self,
        *,
        debug_id: str = '',
        target_module: str,
        intent: str,
        description: str,
        feature_description: str,
        input_spec: str,
        output_spec: str,
        generation_question: str,
        selected_function_ids: list[str],
        selected_workflow: dict | None,
        rag_top_k: int,
        rag_module: str | None,
    ) -> dict:
        fn_briefs = []
        for fid in selected_function_ids[:50]:
            fn = self._store.get_function(fid)
            if not fn:
                continue
            fn_briefs.append(
                {
                    'function_id': fn.get('function_id'),
                    'display_name': fn.get('display_name'),
                    'module': fn.get('module'),
                    'file_path': fn.get('file_path'),
                    'signature': fn.get('signature'),
                    'doc_zh': fn.get('doc_zh') or '',
                    'doc_en': fn.get('doc_en') or '',
                }
            )

        payload = {
            'target_module': target_module,
            'intent': intent,
            'description': description,
            'feature_description': feature_description,
            'input_spec': input_spec,
            'output_spec': output_spec,
            'generation_question': generation_question,
            'selected_functions': fn_briefs,
            'selected_workflow': selected_workflow,
        }

        def first_str(d: dict, keys: list[str]) -> str:
            for k in keys:
                v = d.get(k)
                if isinstance(v, str) and v.strip():
                    return v.strip()
            return ''

        def as_list(v) -> list[str]:
            if v is None:
                return []
            if isinstance(v, list):
                out: list[str] = []
                for it in v:
                    s = str(it).strip()
                    if s:
                        out.append(s)
                return out
            s = str(v).strip()
            if not s:
                return []
            return [s]

        def pick_md_section(md: str, title: str) -> str:
            m = re.search(rf'^\s*##\s*{re.escape(title)}\s*(?:[（(].*?[）)])?\s*$([\s\S]*?)(^\s*##\s|\Z)', md, flags=re.M)
            return (m.group(1).strip() if m else '').strip()

        def parse_bullets(block: str) -> list[str]:
            items: list[str] = []
            for raw in str(block or '').splitlines():
                s = raw.strip()
                if not s:
                    continue
                if s.startswith('#'):
                    continue
                s = re.sub(r'^\s*[-*•·–—]\s*(?:\[[ xX]\]\s*)?', '', s)
                s = re.sub(r'^\s*(?:\(?\d+\)?[.)、:]|\d+[、.]|\d+\)|[①②③④⑤⑥⑦⑧⑨⑩])\s*', '', s)
                s = s.strip()
                if s:
                    items.append(s)
            dedup: list[str] = []
            seen = set()
            for x in items:
                if x in seen:
                    continue
                seen.add(x)
                dedup.append(x)
            return dedup

        analysis_md = ''
        suggested_q = ''
        used_model = ''
        analysis_struct: dict = {
            'goal': '',
            'constraints': '',
            'subtasks': '',
            'risk_items': [],
            'missing_items': [],
        }
        try:
            client = get_openai_client()
            model = get_chat_model()
            used_model = str(model or '').strip()
            prompt = {
                'task': '你是智能驾驶代码生产线的任务分析助手。请对输入工单进行问题分析，并输出结构化结果。',
                'constraints': {
                    'language': 'zh',
                    'output': 'markdown',
                    'no_secrets': True,
                },
                'input': payload,
                'output_schema': {
                    'analysis_markdown': 'markdown string',
                    'suggested_rag_query': 'string',
                },
                'notes': (
                    '分析必须使用 Markdown 标题（## 开头）并严格包含以下章节，且每章都用条目列表（-）输出：\n'
                    '1) 任务目标\n'
                    '2) 关键约束\n'
                    '3) 建议拆分的子任务\n'
                    '4) 风险点/歧义点\n'
                    '5) 缺失信息清单\n'
                    '6) 推荐关联的模块/函数特征\n'
                    '标题必须与上述文字一致（允许带括号英文别名，但中文标题需完全匹配）。'
                ),
            }

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
            try:
                obj = json.loads(text)
            except Exception:
                m = re.search(r'\{[\s\S]*\}', text)
                try:
                    obj = json.loads(m.group(0)) if m else {}
                except Exception:
                    obj = {'analysis_markdown': text, 'suggested_rag_query': ''}

            root = obj if isinstance(obj, dict) else {}
            nested = root.get('output') if isinstance(root.get('output'), dict) else root.get('analysis') if isinstance(root.get('analysis'), dict) else {}
            if not isinstance(nested, dict):
                nested = {}
            merged = {**nested, **root}

            analysis_md = first_str(
                merged,
                [
                    'analysis_markdown',
                    'analysisMarkdown',
                    'analysis_md',
                    'analysisMd',
                    'markdown',
                    'analysis',
                ],
            )
            suggested_q = first_str(
                merged,
                [
                    'suggested_rag_query',
                    'suggestedRagQuery',
                    'rag_query',
                    'ragQuery',
                    'query',
                ],
            )

            if not analysis_md:
                goal = first_str(merged, ['goal', 'task_goal', 'taskGoal', '任务目标'])
                constraints = merged.get('constraints')
                subtasks = merged.get('subtasks')
                risk_items = merged.get('risk_items') or merged.get('risks') or merged.get('riskItems')
                missing_items = merged.get('missing_items') or merged.get('missing') or merged.get('missingItems')
                constraints_items = as_list(constraints)
                subtasks_items = as_list(subtasks)
                risk_list = as_list(risk_items)
                missing_list = as_list(missing_items)
                analysis_md = (
                    '## 任务目标\n'
                    + ('\n'.join([f'- {x}' for x in (as_list(goal) or [feature_description or generation_question or description or '']) if str(x).strip()]).strip() + '\n\n')
                    + '## 关键约束\n'
                    + ('\n'.join([f'- {x}' for x in constraints_items]).strip() + '\n\n' if constraints_items else '- -\n\n')
                    + '## 建议拆分的子任务\n'
                    + ('\n'.join([f'- {x}' for x in subtasks_items]).strip() + '\n\n' if subtasks_items else '- -\n\n')
                    + '## 风险点/歧义点\n'
                    + ('\n'.join([f'- {x}' for x in risk_list]).strip() + '\n\n' if risk_list else '- -\n\n')
                    + '## 缺失信息清单\n'
                    + ('\n'.join([f'- {x}' for x in missing_list]).strip() + '\n\n' if missing_list else '- -\n\n')
                    + '## 推荐关联的模块/函数特征\n'
                    + '- -\n'
                ).strip()

            goal_block = pick_md_section(analysis_md, '任务目标')
            constraints_block = pick_md_section(analysis_md, '关键约束')
            subtasks_block = pick_md_section(analysis_md, '建议拆分的子任务')
            risk_block = pick_md_section(analysis_md, '风险点/歧义点')
            missing_block = pick_md_section(analysis_md, '缺失信息清单')
            analysis_struct = {
                'goal': goal_block.strip(),
                'constraints': constraints_block.strip(),
                'subtasks': subtasks_block.strip(),
                'risk_items': parse_bullets(risk_block),
                'missing_items': parse_bullets(missing_block),
            }
        except Exception as e:
            msg = str(e) or type(e).__name__
            analysis_md = (
                '## 任务目标\n'
                f'- {feature_description or generation_question or description or ""}\n\n'
                '## 关键约束\n'
                '- 输出必须可编译、可通过门禁（编译/静态检查/单元测试，若有）。\n'
                '- 严格遵守既有工程结构、命名与接口约束，避免引入新依赖。\n\n'
                '## 建议拆分的子任务\n'
                '- 明确改动范围与入口函数/模块。\n'
                '- 设计或确认数据结构与接口（输入/输出/边界条件）。\n'
                '- 实现核心逻辑并补齐必要的工具/胶水。\n'
                '- 增加最小可验证用例并自测。\n\n'
                '## 风险点/歧义点\n'
                f'- LLM 分析暂不可用：{msg}\n\n'
                '## 缺失信息清单\n'
                '- 请稍后重试；若持续失败，检查 LLM 配置与网络连通性。\n'
                '\n## 推荐关联的模块/函数特征\n'
                '- 关键词建议：优先包含模块名/文件名/函数名等可检索特征。\n'
            ).strip()
            suggested_q = ''
            analysis_struct = {
                'goal': pick_md_section(analysis_md, '任务目标').strip(),
                'constraints': pick_md_section(analysis_md, '关键约束').strip(),
                'subtasks': pick_md_section(analysis_md, '建议拆分的子任务').strip(),
                'risk_items': parse_bullets(pick_md_section(analysis_md, '风险点/歧义点')),
                'missing_items': parse_bullets(pick_md_section(analysis_md, '缺失信息清单')),
            }
        rag_query = suggested_q or generation_question or feature_description or description
        rag_query = rag_query.strip()

        rag_hits = []
        if rag_query:
            hits = self._rag.query(rag_query, int(rag_top_k), module=rag_module)
            rag_hits = [
                {
                    'function_id': h.function_id,
                    'name': h.name,
                    'module': h.module,
                    'score': float(h.score),
                    'file_path': h.file_path,
                    'signature': h.signature,
                    'doc_zh': h.doc_zh,
                }
                for h in hits
            ]

        return {
            'analysis_markdown': analysis_md,
            'analysis_struct': analysis_struct,
            'llm_model': used_model,
            'rag_query': rag_query,
            'rag_hits': rag_hits,
        }
