from fastapi import APIRouter

from backend.app.schemas import (
    CotGeneratePromptRequest,
    CotGeneratePromptResponse,
    CotQuestionRequest,
    CotQuestionResponse,
    CotRefineRequest,
    CotRefineResponse,
    OrchestratorGenerateRequest,
    OrchestratorGenerateResponse,
)
from backend.app.services.cot_service import CotService
from backend.app.services.orchestrator_service import OrchestratorService


router = APIRouter(prefix='/cot', tags=['cot'])
service = CotService()
orchestrator = OrchestratorService()


@router.post('/question', response_model=CotQuestionResponse)
def question(req: CotQuestionRequest):
    try:
        q = service.make_question(
            mode=req.mode,
            item=req.item,
            goal=req.goal,
            constraints=req.constraints,
            subtasks=req.subtasks,
            risk_items=list(req.risk_items or []),
            missing_items=list(req.missing_items or []),
        )
        return CotQuestionResponse(ok=True, question=q)
    except Exception as e:
        msg = str(e) or type(e).__name__
        return CotQuestionResponse(ok=False, error=msg)


@router.post('/refine', response_model=CotRefineResponse)
def refine(req: CotRefineRequest):
    try:
        out = service.refine_with_answer(
            mode=req.mode,
            item=req.item,
            answer=req.answer,
            goal=req.goal,
            constraints=req.constraints,
            subtasks=req.subtasks,
            risk_items=list(req.risk_items or []),
            missing_items=list(req.missing_items or []),
        )
        return CotRefineResponse(ok=True, **out)
    except Exception as e:
        msg = str(e) or type(e).__name__
        return CotRefineResponse(
            ok=False,
            error=msg,
            resolved=False,
            goal=req.goal,
            constraints=req.constraints,
            subtasks=req.subtasks,
            risk_items=list(req.risk_items or []),
            missing_items=list(req.missing_items or []),
        )


@router.post('/generate-prompt', response_model=CotGeneratePromptResponse)
def generate_prompt(req: CotGeneratePromptRequest):
    try:
        out = service.build_final_prompt(
            goal=req.goal,
            constraints=req.constraints,
            subtasks=req.subtasks,
            related_function_ids=list(req.related_function_ids or []),
        )
        return CotGeneratePromptResponse(ok=True, **out)
    except Exception as e:
        msg = str(e) or type(e).__name__
        return CotGeneratePromptResponse(ok=False, error=msg, used_function_ids=[])


@router.post('/orchestrator-generate', response_model=OrchestratorGenerateResponse)
def orchestrator_generate(req: OrchestratorGenerateRequest):
    try:
        out = orchestrator.generate(prompt=req.prompt)
        return OrchestratorGenerateResponse(ok=True, **out)
    except Exception as e:
        msg = str(e) or type(e).__name__
        return OrchestratorGenerateResponse(ok=False, error=msg, key_points=[])
