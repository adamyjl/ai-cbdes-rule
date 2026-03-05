from fastapi import APIRouter, File, Form, UploadFile
from pathlib import Path
from uuid import uuid4

from backend.app.services.data_dir import get_data_dir
from pydantic import BaseModel

from backend.app.schemas import IndexRequest, RagQueryRequest, RagQueryResponse, ScanRequest
from backend.app.services.rag_service import RagService
from backend.app.services.defaults import get_default_rag_root


router = APIRouter(prefix="/rag", tags=["rag"])
rag_service = RagService()


def _sanitize_relpath(name: str) -> str:
    raw = str(name or '').replace('\\', '/').strip()
    raw = raw.lstrip('/')
    if ':' in raw:
        raw = raw.split(':', 1)[1].lstrip('/')
    parts = []
    for p in raw.split('/'):
        p = p.strip()
        if not p or p in {'.', '..'}:
            continue
        parts.append(p)
    return '/'.join(parts)


@router.post('/upload')
async def upload_code(
    files: list[UploadFile] = File(...),
    upload_id: str | None = Form(None),
):
    uid = (upload_id or '').strip() or uuid4().hex
    base = (get_data_dir() / 'uploads').resolve()
    target_root = (base / uid).resolve()
    target_root.mkdir(parents=True, exist_ok=True)

    total_files = 0
    total_bytes = 0
    saved_files = 0
    skipped_files = 0
    for uf in files:
        total_files += 1
        rel = _sanitize_relpath(uf.filename or '')
        if not rel:
            skipped_files += 1
            continue
        dst = (target_root / rel).resolve()
        if target_root not in dst.parents and dst != target_root:
            skipped_files += 1
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)

        with dst.open('wb') as f:
            while True:
                chunk = await uf.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)
                total_bytes += len(chunk)
        saved_files += 1

    return {
        'ok': True,
        'upload_id': uid,
        'root_dir': str(target_root),
        'files_total': total_files,
        'files_saved': saved_files,
        'files_skipped': skipped_files,
        'bytes': total_bytes,
    }


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


class KindJobRequest(BaseModel):
    root_dir: str | None = None


@router.post('/kind-job')
def start_kind_job(req: KindJobRequest):
    return rag_service.start_kind_job(root_dir=req.root_dir)


@router.get('/kind-job/{job_id}')
def get_kind_job(job_id: str):
    return rag_service.get_kind_job(job_id)


@router.post('/kind-job/{job_id}/cancel')
def cancel_kind_job(job_id: str):
    return rag_service.cancel_kind_job(job_id)


class PublishModuleRequest(BaseModel):
    root_dir: str
    graph: dict
    module_key: str | None = None
    display_name_hint: str | None = None
    source: str | None = None
    similarity_threshold: float = 0.92


@router.post('/publish-module')
def publish_module(req: PublishModuleRequest):
    return rag_service.publish_module(
        root_dir=req.root_dir,
        graph=req.graph,
        module_key=req.module_key,
        display_name_hint=str(req.display_name_hint or ''),
        source=str(req.source or 'builder'),
        similarity_threshold=float(req.similarity_threshold or 0.92),
    )


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
    kind: str | None = None,
    q: str | None = None,
    limit: int = 200,
    offset: int = 0,
):
    return rag_service.list_functions(root_dir=root_dir, module=module, kind=kind, q=q, limit=limit, offset=offset)


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


class ModuleIndexRequest(BaseModel):
    root_dir: str


@router.post('/module-index-job')
def start_module_index_job(req: ModuleIndexRequest):
    return rag_service.start_module_index_job(req.root_dir)


@router.get('/module-index-job/{job_id}')
def get_module_index_job(job_id: str):
    return rag_service.get_module_index_job(job_id)


@router.post('/module-index-job/{job_id}/cancel')
def cancel_module_index_job(job_id: str):
    return rag_service.cancel_module_index_job(job_id)


@router.get('/indexed-modules')
def list_indexed_modules(
    root_dir: str | None = None,
    q: str | None = None,
    limit: int = 200,
    offset: int = 0,
):
    return rag_service.list_indexed_modules(root_dir=root_dir, q=q, limit=limit, offset=offset)


@router.get('/module')
def get_module(module_key: str):
    return rag_service.get_module(module_key)


class UpsertModuleRequest(BaseModel):
    root_dir: str
    module: dict


@router.put('/module')
def upsert_module(req: UpsertModuleRequest):
    return rag_service.upsert_module(module=req.module, root_dir=req.root_dir)


class DeleteModulesRequest(BaseModel):
    module_keys: list[str] = []


@router.post('/modules/delete')
def delete_modules(req: DeleteModulesRequest):
    return rag_service.delete_modules(module_keys=req.module_keys)
