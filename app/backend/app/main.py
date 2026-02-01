from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

from backend.app.routers.archive import router as archive_router
from backend.app.routers.codegen import router as codegen_router
from backend.app.routers.cot import router as cot_router
from backend.app.routers.gate import router as gate_router
from backend.app.routers.orchestrator import router as orchestrator_router
from backend.app.routers.rag import router as rag_router
from backend.app.routers.release import router as release_router
from backend.app.routers.task import router as task_router
from backend.app.services.defaults import get_default_rag_root, is_auto_index_enabled
from backend.app.services.rag_service import RagService
from backend.app.services.data_dir import get_data_dir


app = FastAPI(title="AI-CBDES-Rule FastAPI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(rag_router)
app.include_router(archive_router)
app.include_router(codegen_router)
app.include_router(task_router)
app.include_router(cot_router)
app.include_router(orchestrator_router)
app.include_router(gate_router)
app.include_router(release_router)


@app.on_event('startup')
async def auto_index_default_repo() -> None:
    if not is_auto_index_enabled():
        return

    root_dir = get_default_rag_root()
    if not Path(root_dir).exists():
        return

    if not (os.environ.get('ALIYUN_API_KEY') or os.environ.get('DASHSCOPE_API_KEY') or os.environ.get('AI_CBDES_ALIYUN_API_KEY')):
        return

    service = RagService()
    stats = service.status()
    if int(stats.get('embedded') or 0) > 0:
        return

    asyncio.create_task(asyncio.to_thread(service.index, root_dir, enrich=True, max_functions=None))


@app.on_event('startup')
async def rebase_rag_paths_once() -> None:
    data_dir = get_data_dir()
    marker = data_dir / 'rag_paths_rebased.marker'
    if marker.exists():
        return
    service = RagService()
    res = service.rebase_paths()
    if bool(res.get('ok')):
        marker.write_text('ok', encoding='utf-8')


@app.get("/health")
def health():
    return {"ok": True}
