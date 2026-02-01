from fastapi import APIRouter

from backend.app.schemas import (
    CodegenGenerateRequest,
    CodegenGenerateResponse,
    CodegenPlanRequest,
    CodegenPlanResponse,
)
from backend.app.services.codegen_service import CodegenService


router = APIRouter(prefix="/codegen", tags=["codegen"])
codegen_service = CodegenService()


@router.post("/plan", response_model=CodegenPlanResponse)
def plan(req: CodegenPlanRequest):
    plan_md = codegen_service.plan(req.task_id, req.requirement)
    return CodegenPlanResponse(task_id=req.task_id, plan_markdown=plan_md)


@router.post("/generate", response_model=CodegenGenerateResponse)
def generate(req: CodegenGenerateRequest):
    patch = codegen_service.generate(req.task_id, req.plan_markdown)
    return CodegenGenerateResponse(task_id=req.task_id, patch_diff=patch)

