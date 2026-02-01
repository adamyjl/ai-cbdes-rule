from pydantic import BaseModel
from typing import Any


class ScanRequest(BaseModel):
    root_dir: str
    max_preview: int = 0


class IndexRequest(BaseModel):
    root_dir: str
    enrich: bool = True
    max_functions: int | None = None


class RagQueryRequest(BaseModel):
    query: str
    top_k: int = 5
    module: str | None = None


class RagQueryHit(BaseModel):
    function_id: str
    name: str
    module: str
    score: float
    file_path: str | None = None
    signature: str | None = None
    doc_zh: str | None = None


class RagQueryResponse(BaseModel):
    hits: list[RagQueryHit]


class ArchiveEventIn(BaseModel):
    type: str
    payload: dict


class ArchiveEventOut(BaseModel):
    id: str
    type: str
    payload: dict
    ts: str | None = None


class CodegenPlanRequest(BaseModel):
    task_id: str
    requirement: str


class CodegenPlanResponse(BaseModel):
    task_id: str
    plan_markdown: str


class CodegenGenerateRequest(BaseModel):
    task_id: str
    plan_markdown: str


class CodegenGenerateResponse(BaseModel):
    task_id: str
    patch_diff: str


class TaskAnalyzeRequest(BaseModel):
    target_module: str
    intent: str
    description: str = ''
    feature_description: str = ''
    input_spec: str = ''
    output_spec: str = ''
    generation_question: str = ''
    selected_function_ids: list[str] = []
    selected_workflow: dict[str, Any] | None = None
    root_dir: str | None = None
    rag_top_k: int = 8


class TaskAnalyzeHit(BaseModel):
    function_id: str
    name: str
    module: str
    score: float
    file_path: str | None = None
    signature: str | None = None
    doc_zh: str | None = None


class TaskAnalyzeResponse(BaseModel):
    ok: bool
    analysis_markdown: str | None = None
    rag_query: str | None = None
    rag_hits: list[TaskAnalyzeHit] = []
    error: str | None = None


class CotQuestionRequest(BaseModel):
    mode: str
    item: str
    goal: str = ''
    constraints: str = ''
    subtasks: str = ''
    risk_items: list[str] = []
    missing_items: list[str] = []


class CotQuestionResponse(BaseModel):
    ok: bool
    question: str | None = None
    error: str | None = None


class CotRefineRequest(BaseModel):
    mode: str
    item: str
    answer: str
    goal: str = ''
    constraints: str = ''
    subtasks: str = ''
    risk_items: list[str] = []
    missing_items: list[str] = []


class CotRefineResponse(BaseModel):
    ok: bool
    resolved: bool = False
    goal: str = ''
    constraints: str = ''
    subtasks: str = ''
    risk_items: list[str] = []
    missing_items: list[str] = []
    error: str | None = None


class CotGeneratePromptRequest(BaseModel):
    goal: str = ''
    constraints: str = ''
    subtasks: str = ''
    risk_items: list[str] = []
    missing_items: list[str] = []
    related_function_ids: list[str] = []
    root_dir: str | None = None


class CotGeneratePromptResponse(BaseModel):
    ok: bool
    prompt: str | None = None
    used_function_ids: list[str] = []
    error: str | None = None


class OrchestratorGenerateRequest(BaseModel):
    prompt: str
    source_event_id: str | None = None
    source_event_type: str | None = None


class OrchestratorGenerateResponse(BaseModel):
    ok: bool
    result: str | None = None
    key_points: list[str] = []
    log: str | None = None
    error: str | None = None


class OrchestratorCodegenRequest(BaseModel):
    prompt: str
    source_event_id: str | None = None
    source_event_type: str | None = None


class OrchestratorCodegenResponse(BaseModel):
    ok: bool
    code: str | None = None
    key_points: list[str] = []
    log: str | None = None
    error: str | None = None


class GateStartRequest(BaseModel):
    work_dir: str
    compile_command: str
    static_command: str
    enable_unit: bool = True
    enable_coverage: bool = True
    requirement_prompt: str = ''
    generated_result: str = ''
    source_event_id: str | None = None
    source_event_type: str | None = None


class GateStartResponse(BaseModel):
    ok: bool
    job_id: str | None = None
    error: str | None = None


class GateJobStatus(BaseModel):
    step: str
    status: str
    started_at: str | None = None
    finished_at: str | None = None


class GateJobResponse(BaseModel):
    ok: bool
    job_id: str
    stage: str
    statuses: list[GateJobStatus] = []
    log_lines: list[str] = []
    error: str | None = None
    done: bool = False


class GateCancelResponse(BaseModel):
    ok: bool
