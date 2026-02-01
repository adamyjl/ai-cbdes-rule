from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.services.release_service import ReleaseService


router = APIRouter(prefix="/release", tags=["release"])
service = ReleaseService()


class ReleaseRagIndexRequest(BaseModel):
    version: str
    functions: list[dict]


class ReleaseModulesUpsertRequest(BaseModel):
    version: str
    namespace: str | None = None
    functions: list[dict]


@router.post('/rag-index')
def rag_index(req: ReleaseRagIndexRequest):
    return service.rag_index(version=req.version, functions=req.functions)


@router.post('/modules-upsert')
def modules_upsert(req: ReleaseModulesUpsertRequest):
    return service.modules_upsert(version=req.version, namespace=req.namespace or 'default', functions=req.functions)

