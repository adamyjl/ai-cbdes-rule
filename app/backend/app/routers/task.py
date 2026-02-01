from fastapi import APIRouter

from backend.app.schemas import TaskAnalyzeRequest, TaskAnalyzeResponse
from backend.app.services.task_analysis_service import TaskAnalysisService


router = APIRouter(prefix='/task', tags=['task'])
service = TaskAnalysisService()


@router.post('/analyze', response_model=TaskAnalyzeResponse)
def analyze(req: TaskAnalyzeRequest):
    try:
        out = service.analyze(
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
        return TaskAnalyzeResponse(ok=True, **out)
    except Exception as e:
        msg = str(e) or type(e).__name__
        return TaskAnalyzeResponse(ok=False, error=msg, rag_hits=[])

