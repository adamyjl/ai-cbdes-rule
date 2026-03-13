from fastapi import APIRouter

from uuid import uuid4

from backend.app.schemas import TaskAnalyzeRequest, TaskAnalyzeResponse
from backend.app.services.task_analysis_service import TaskAnalysisService
from backend.app.services.oplog import write_oplog


router = APIRouter(prefix='/task', tags=['task'])
service = TaskAnalysisService()


@router.post('/analyze', response_model=TaskAnalyzeResponse)
def analyze(req: TaskAnalyzeRequest):
    debug_id = uuid4().hex[:12]
    try:
        write_oplog(
            name='task_analyze.jsonl',
            event='task.analyze.request',
            payload={
                'debug_id': debug_id,
                'target_module': req.target_module,
                'intent': req.intent,
                'feature_description_len': len(req.feature_description or ''),
                'generation_question_len': len(req.generation_question or ''),
                'selected_function_ids_n': len(req.selected_function_ids or []),
                'rag_top_k': int(req.rag_top_k),
            },
        )
        out = service.analyze(
            debug_id=debug_id,
            target_module=req.target_module,
            intent=req.intent,
            description=req.description,
            feature_description=req.feature_description,
            input_spec=req.input_spec,
            output_spec=req.output_spec,
            generation_question=req.generation_question,
            selected_function_ids=list(req.selected_function_ids or []),
            selected_workflow=req.selected_workflow,
            rag_top_k=int(req.rag_top_k),
            rag_module=req.target_module or None,
        )
        write_oplog(
            name='task_analyze.jsonl',
            event='task.analyze.response',
            payload={
                'debug_id': debug_id,
                'ok': True,
                'llm_model': out.get('llm_model') if isinstance(out, dict) else None,
                'analysis_markdown_len': len(str((out or {}).get('analysis_markdown') or '')),
                'analysis_struct_keys': sorted(list(((out or {}).get('analysis_struct') or {}).keys())),
                'risk_n': len(((out or {}).get('analysis_struct') or {}).get('risk_items') or []),
                'missing_n': len(((out or {}).get('analysis_struct') or {}).get('missing_items') or []),
            },
        )
        out['debug_id'] = debug_id
        return TaskAnalyzeResponse(ok=True, **out)
    except Exception as e:
        msg = str(e) or type(e).__name__
        write_oplog(name='task_analyze.jsonl', event='task.analyze.response', payload={'debug_id': debug_id, 'ok': False, 'error': msg})
        return TaskAnalyzeResponse(ok=False, debug_id=debug_id, error=msg, rag_hits=[])
