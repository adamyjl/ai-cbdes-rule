from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.schemas import (
    CodegenGenerateRequest,
    CodegenGenerateResponse,
    CodegenPlanRequest,
    CodegenPlanResponse,
)
from backend.app.services.codegen_service import CodegenService
from backend.app.services.glue_codegen_service import GlueCodegenService


router = APIRouter(prefix="/codegen", tags=["codegen"])
codegen_service = CodegenService()
glue_service = GlueCodegenService()


@router.post("/plan", response_model=CodegenPlanResponse)
def plan(req: CodegenPlanRequest):
    plan_md = codegen_service.plan(req.task_id, req.requirement)
    return CodegenPlanResponse(task_id=req.task_id, plan_markdown=plan_md)


@router.post("/generate", response_model=CodegenGenerateResponse)
def generate(req: CodegenGenerateRequest):
    patch = codegen_service.generate(req.task_id, req.plan_markdown)
    return CodegenGenerateResponse(task_id=req.task_id, patch_diff=patch)


class GlueGenerateRequest(BaseModel):
    task: str = ''
    from_node: dict
    to_node: dict


@router.post('/glue')
def generate_glue(req: GlueGenerateRequest):
    try:
        out = glue_service.generate_glue(task=str(req.task or ''), from_node=req.from_node, to_node=req.to_node)
        return {'ok': True, **out}
    except Exception as e:
        msg = str(e) or type(e).__name__
        return {'ok': False, 'error': msg}


class GlueCppGenerateRequest(BaseModel):
    task: str = ''
    from_node: dict
    to_node: dict
    from_code: str = ''
    to_code: str = ''
    cpp_rules: str = ''


@router.post('/glue-cpp')
@router.post('/glue_cpp')
def generate_glue_cpp(req: GlueCppGenerateRequest):
    try:
        out = glue_service.generate_glue_cpp(
            task=str(req.task or ''),
            from_node=req.from_node,
            to_node=req.to_node,
            from_code=str(req.from_code or ''),
            to_code=str(req.to_code or ''),
            cpp_rules=str(req.cpp_rules or ''),
        )
        return {'ok': True, **out}
    except Exception as e:
        msg = str(e) or type(e).__name__
        return {'ok': False, 'error': msg}
