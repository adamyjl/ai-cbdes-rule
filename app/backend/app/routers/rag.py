from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.schemas import IndexRequest, RagQueryRequest, RagQueryResponse, ScanRequest
from backend.app.services.rag_service import RagService
from backend.app.services.defaults import get_default_rag_root


router = APIRouter(prefix="/rag", tags=["rag"])
rag_service = RagService()


@router.post("/scan")
def scan(req: ScanRequest):
    return rag_service.scan(req.root_dir, max_preview=req.max_preview)


@router.post("/index")
def index(req: IndexRequest):
    return rag_service.index(req.root_dir, enrich=req.enrich, max_functions=req.max_functions)


@router.post('/index-job')
def start_index_job(req: IndexRequest):
    return rag_service.start_index_job(req.root_dir, enrich=req.enrich, max_functions=req.max_functions)


@router.get('/index-job/{job_id}')
def get_index_job(job_id: str):
    return rag_service.get_index_job(job_id)


@router.post('/index-job/{job_id}/cancel')
def cancel_index_job(job_id: str):
    return rag_service.cancel_index_job(job_id)


class EnrichFunctionRequest(BaseModel):
    function_id: str
    root_dir: str | None = None


@router.post('/function/enrich')
def enrich_function_now(req: EnrichFunctionRequest):
    return rag_service.enrich_function_now(function_id=req.function_id, root_dir=req.root_dir)


class BackfillDocsRequest(BaseModel):
    root_dir: str | None = None
    limit: int = 2000


@router.post('/backfill-docs-job')
def start_backfill_docs_job(req: BackfillDocsRequest):
    return rag_service.start_backfill_docs_job(root_dir=req.root_dir, limit=req.limit)


@router.get('/backfill-docs-job/{job_id}')
def get_backfill_docs_job(job_id: str):
    return rag_service.get_backfill_docs_job(job_id)


@router.post('/backfill-docs-job/{job_id}/cancel')
def cancel_backfill_docs_job(job_id: str):
    return rag_service.cancel_backfill_docs_job(job_id)


@router.post("/query", response_model=RagQueryResponse)
def query(req: RagQueryRequest):
    hits = rag_service.query(req.query, req.top_k, module=req.module)
    return RagQueryResponse(hits=hits)


@router.get("/function")
def get_function(function_id: str):
    return rag_service.get_function(function_id)


@router.get("/status")
def status():
    return rag_service.status()


@router.post('/rebase-paths')
def rebase_paths():
    return rag_service.rebase_paths()


@router.get("/default-root")
def default_root():
    return {"root_dir": get_default_rag_root()}


@router.get('/modules')
def list_modules(root_dir: str | None = None):
    return rag_service.list_modules(root_dir=root_dir)


@router.get('/functions')
def list_functions(
    root_dir: str | None = None,
    module: str | None = None,
    q: str | None = None,
    limit: int = 200,
    offset: int = 0,
):
    return rag_service.list_functions(root_dir=root_dir, module=module, q=q, limit=limit, offset=offset)


class SaveSourceRequest(BaseModel):
    function_id: str
    new_code: str
    write_file: bool = True
    root_dir: str | None = None
    re_enrich: bool = False


@router.put('/function/source')
def save_function_source(req: SaveSourceRequest):
    return rag_service.save_function_source(
        function_id=req.function_id,
        new_code=req.new_code,
        write_file=bool(req.write_file),
        root_dir=req.root_dir,
        re_enrich=bool(req.re_enrich),
    )


class TestRunRequest(BaseModel):
    cwd: str
    command: str
    timeout_ms: int = 60000


@router.post('/test-run')
def test_run(req: TestRunRequest):
    return rag_service.run_test(cwd=req.cwd, command=req.command, timeout_ms=req.timeout_ms)


class DeleteFunctionsRequest(BaseModel):
    function_ids: list[str] = []


@router.post('/functions/delete')
def delete_functions(req: DeleteFunctionsRequest):
    return rag_service.delete_functions(function_ids=req.function_ids)


class DeleteByRootDirRequest(BaseModel):
    root_dir: str


@router.post('/functions/delete-by-root')
def delete_by_root_dir(req: DeleteByRootDirRequest):
    return rag_service.delete_by_root_dir(root_dir=req.root_dir)
