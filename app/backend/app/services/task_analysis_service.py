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

        analysis_md = ''
        suggested_q = ''
        try:
            client = get_openai_client()
            model = get_chat_model()
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
                'notes': '分析应包含：任务目标、关键约束、风险点/歧义点、缺失信息清单、建议拆分的子任务、推荐关联的模块/函数特征。',
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

            analysis_md = str(obj.get('analysis_markdown') or '').strip()
            suggested_q = str(obj.get('suggested_rag_query') or '').strip()
        except Exception as e:
            msg = str(e) or type(e).__name__
            analysis_md = (
                '## 任务目标\n'
                f'- {feature_description or generation_question or description or ""}\n\n'
                '## 风险点/歧义点\n'
                f'- LLM 分析暂不可用：{msg}\n\n'
                '## 缺失信息清单\n'
                '- 请稍后重试；若持续失败，检查 LLM 配置与网络连通性。\n'
            ).strip()
            suggested_q = ''
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
            'rag_query': rag_query,
            'rag_hits': rag_hits,
        }
