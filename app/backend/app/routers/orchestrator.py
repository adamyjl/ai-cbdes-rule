from fastapi import APIRouter

from backend.app.schemas import (
    OrchestratorCodegenRequest,
    OrchestratorCodegenResponse,
    OrchestratorGenerateRequest,
    OrchestratorGenerateResponse,
)
from backend.app.services.orchestrator_service import OrchestratorService


router = APIRouter(prefix='/orchestrator', tags=['orchestrator'])
service = OrchestratorService()


@router.post('/generate', response_model=OrchestratorGenerateResponse)
def generate(req: OrchestratorGenerateRequest):
    try:
        out = service.generate(prompt=req.prompt)
        return OrchestratorGenerateResponse(ok=True, **out)
    except Exception as e:
        msg = str(e) or type(e).__name__
        return OrchestratorGenerateResponse(ok=False, error=msg, key_points=[])


@router.post('/generate-code', response_model=OrchestratorCodegenResponse)
def generate_code(req: OrchestratorCodegenRequest):
    try:
        out = service.generate_cpp_code(prompt=req.prompt)
        return OrchestratorCodegenResponse(ok=True, **out)
    except Exception as e:
        msg = str(e) or type(e).__name__
        return OrchestratorCodegenResponse(ok=False, error=msg, key_points=[])
