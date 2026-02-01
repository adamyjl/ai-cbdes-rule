export type AppModule = 'common' | 'perception' | 'planning' | 'decision' | 'localization' | 'control'

export type RagQueryHit = {
  function_id: string
  name: string
  module: AppModule | string
  score: number
  file_path?: string
  signature?: string
  doc_zh?: string
}

export type RagQueryResponse = {
  hits: RagQueryHit[]
}

export type FunctionIndexItem = {
  function_id: string
  language: string
  file_path: string
  start_line: number
  end_line: number
  signature: string
  display_name: string
  module: AppModule | string
  doc_zh: string
  embedded: number
  updated_at: string
}

export type RagModulesResponse = {
  total: number
  embedded: number
  modules: Array<{ module: string; count: number; embedded: number }>
}

export type RagFunctionsResponse = {
  total: number
  limit: number
  offset: number
  items: FunctionIndexItem[]
}

export type RagSaveSourceResponse = {
  ok: boolean
  error?: string
  patch?: any
  function?: any
}

export type RagTestRunResponse = {
  ok: boolean
  exit_code: number
  duration_ms: number
  stdout: string
  stderr: string
}

export type ArchiveEvent = {
  id: string
  type: string
  payload: Record<string, unknown>
  ts?: string
}

export type ReleaseRagIndexItem = {
  function_id: string
  file_path: string
  display_name: string
  module: string
  doc_zh: string
  embedded: number
}

export type ReleaseRagIndexResponse = {
  ok: boolean
  error?: string
  version?: string
  root_dir?: string
  upserted?: number
  items?: ReleaseRagIndexItem[]
}

export type ReleaseModuleItem = {
  module_key: string
  version: string
  namespace: string
  root_function: string
  functions: string[]
  edges: Array<{ from: string; to: string }>
  created_at?: string
  updated_at?: string
}

export type ReleaseModulesUpsertResponse = {
  ok: boolean
  error?: string
  version?: string
  namespace?: string
  upserted?: number
  modules?: ReleaseModuleItem[]
}

export type CodegenPlanResponse = {
  task_id: string
  plan_markdown: string
}

export type CodegenGenerateResponse = {
  task_id: string
  patch_diff: string
}

async function parseJsonOrText(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'content-type': 'application/json'
    }
  })
  if (!res.ok) {
    const body = await parseJsonOrText(res)
    throw new Error(typeof body === 'string' ? body : JSON.stringify(body))
  }
  return (await res.json()) as T
}

export async function healthExpress() {
  return requestJson<{ ok: boolean }>('/api/health')
}

export async function healthPython() {
  return requestJson<{ ok: boolean }>('/py/health')
}

export async function ragScan(root_dir: string) {
  return requestJson<{ root_dir: string; scanned: boolean; files: number; functions: number }>(
    '/py/rag/scan',
    {
      method: 'POST',
      body: JSON.stringify({ root_dir })
    }
  )
}

export async function ragIndex(root_dir: string, opts?: { enrich?: boolean; max_functions?: number | null }) {
  return requestJson<{
    root_dir: string
    indexed: boolean
    files: number
    functions: number
    upserted: number
    vectors: number
  }>('/py/rag/index', {
    method: 'POST',
    body: JSON.stringify({
      root_dir,
      enrich: opts?.enrich ?? true,
      max_functions: opts?.max_functions ?? null
    })
  })
}

export type RagIndexJobStatus = {
  job_id: string
  root_dir: string
  enrich: boolean
  max_functions: number | null
  stage: string
  started_at: string
  updated_at: string
  total_files: number
  processed_files: number
  current_file: string | null
  total_functions: number
  processed_functions: number
  total_embeddings: number
  processed_embeddings: number
  percent: number
  error: string | null
  canceled: boolean
}

export async function ragStartIndexJob(root_dir: string, opts?: { enrich?: boolean; max_functions?: number | null }) {
  return requestJson<{ ok: boolean; job_id: string }>('/py/rag/index-job', {
    method: 'POST',
    body: JSON.stringify({
      root_dir,
      enrich: opts?.enrich ?? true,
      max_functions: opts?.max_functions ?? null
    })
  })
}

export async function ragGetIndexJob(job_id: string) {
  return requestJson<{ ok: boolean; job?: RagIndexJobStatus; error?: string }>(
    `/py/rag/index-job/${encodeURIComponent(job_id)}`
  )
}

export async function ragCancelIndexJob(job_id: string) {
  return requestJson<{ ok: boolean }>(`/py/rag/index-job/${encodeURIComponent(job_id)}/cancel`, {
    method: 'POST'
  })
}

export async function ragEnrichFunction(function_id: string, root_dir?: string | null) {
  return requestJson<{ ok: boolean; function?: any; error?: string }>(`/py/rag/function/enrich`, {
    method: 'POST',
    body: JSON.stringify({ function_id, root_dir: root_dir ?? null })
  })
}

export type RagBackfillDocsJob = {
  job_id: string
  root_dir: string | null
  stage: string
  started_at: string
  updated_at: string
  total: number
  processed: number
  percent: number
  current_file: string | null
  current_function_id: string | null
  error: string | null
  canceled: boolean
}

export async function ragStartBackfillDocsJob(root_dir?: string | null, limit?: number) {
  return requestJson<{ ok: boolean; job_id: string }>(`/py/rag/backfill-docs-job`, {
    method: 'POST',
    body: JSON.stringify({ root_dir: root_dir ?? null, limit: limit ?? 2000 })
  })
}

export async function ragGetBackfillDocsJob(job_id: string) {
  return requestJson<{ ok: boolean; job?: RagBackfillDocsJob; error?: string }>(
    `/py/rag/backfill-docs-job/${encodeURIComponent(job_id)}`
  )
}

export async function ragCancelBackfillDocsJob(job_id: string) {
  return requestJson<{ ok: boolean }>(`/py/rag/backfill-docs-job/${encodeURIComponent(job_id)}/cancel`, {
    method: 'POST'
  })
}

export async function ragQuery(query: string, top_k: number, module?: string | null) {
  return requestJson<RagQueryResponse>('/py/rag/query', {
    method: 'POST',
    body: JSON.stringify({ query, top_k, module: module ?? null })
  })
}

export async function ragGetFunction(function_id: string) {
  return requestJson<{ ok: boolean; function?: any; error?: string }>(
    `/py/rag/function?function_id=${encodeURIComponent(function_id)}`
  )
}

export async function ragListModules(root_dir?: string) {
  const qs = new URLSearchParams()
  if (root_dir) qs.set('root_dir', root_dir)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return requestJson<RagModulesResponse>(`/py/rag/modules${suffix}`)
}

export async function ragListFunctions(params: {
  root_dir?: string
  module?: string
  q?: string
  limit?: number
  offset?: number
}) {
  const qs = new URLSearchParams()
  if (params.root_dir) qs.set('root_dir', params.root_dir)
  if (params.module) qs.set('module', params.module)
  if (params.q) qs.set('q', params.q)
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  return requestJson<RagFunctionsResponse>(`/py/rag/functions?${qs.toString()}`)
}

export async function ragSaveFunctionSource(req: {
  function_id: string
  new_code: string
  write_file?: boolean
  root_dir?: string | null
  re_enrich?: boolean
}) {
  return requestJson<RagSaveSourceResponse>('/py/rag/function/source', {
    method: 'PUT',
    body: JSON.stringify({
      function_id: req.function_id,
      new_code: req.new_code,
      write_file: req.write_file ?? true,
      root_dir: req.root_dir ?? null,
      re_enrich: req.re_enrich ?? false
    })
  })
}

export async function ragDeleteFunctions(function_ids: string[]) {
  return requestJson<{ ok: boolean; deleted: number }>('/py/rag/functions/delete', {
    method: 'POST',
    body: JSON.stringify({ function_ids })
  })
}

export async function ragDeleteByRootDir(root_dir: string) {
  return requestJson<{ ok: boolean; deleted: number }>('/py/rag/functions/delete-by-root', {
    method: 'POST',
    body: JSON.stringify({ root_dir })
  })
}

export async function ragRunTest(req: { cwd: string; command: string; timeout_ms?: number }) {
  return requestJson<RagTestRunResponse>('/py/rag/test-run', {
    method: 'POST',
    body: JSON.stringify({ cwd: req.cwd, command: req.command, timeout_ms: req.timeout_ms ?? 60000 })
  })
}

export async function releaseRagIndex(req: { version: string; functions: any[] }) {
  return requestJson<ReleaseRagIndexResponse>('/py/release/rag-index', {
    method: 'POST',
    body: JSON.stringify({ version: req.version, functions: req.functions })
  })
}

export async function releaseModulesUpsert(req: { version: string; namespace: string; functions: any[] }) {
  return requestJson<ReleaseModulesUpsertResponse>('/py/release/modules-upsert', {
    method: 'POST',
    body: JSON.stringify({ version: req.version, namespace: req.namespace, functions: req.functions })
  })
}

export async function archiveList(limit: number) {
  const res = await fetch(`/py/archive/events?limit=${encodeURIComponent(String(limit))}`)
  if (!res.ok) {
    const body = await parseJsonOrText(res)
    throw new Error(typeof body === 'string' ? body : JSON.stringify(body))
  }
  return (await res.json()) as ArchiveEvent[]
}

export async function archiveAppend(type: string, payload: Record<string, unknown>) {
  return requestJson<ArchiveEvent>('/py/archive/events', {
    method: 'POST',
    body: JSON.stringify({ type, payload })
  })
}

export async function codegenPlan(task_id: string, requirement: string) {
  return requestJson<CodegenPlanResponse>('/py/codegen/plan', {
    method: 'POST',
    body: JSON.stringify({ task_id, requirement })
  })
}

export async function codegenGenerate(task_id: string, plan_markdown: string) {
  return requestJson<CodegenGenerateResponse>('/py/codegen/generate', {
    method: 'POST',
    body: JSON.stringify({ task_id, plan_markdown })
  })
}

export type TaskAnalysisHit = {
  function_id: string
  name: string
  module: string
  score: number
  file_path?: string | null
  signature?: string | null
  doc_zh?: string | null
}

export type TaskAnalyzeResponse = {
  ok: boolean
  analysis_markdown?: string
  rag_hits?: TaskAnalysisHit[]
  rag_query?: string
  error?: string
}

export async function taskAnalyze(req: {
  target_module: string
  intent: string
  description: string
  feature_description: string
  input_spec: string
  output_spec: string
  generation_question: string
  selected_function_ids: string[]
  selected_workflow?: any | null
  root_dir?: string | null
  rag_top_k?: number
}) {
  return requestJson<TaskAnalyzeResponse>('/py/task/analyze', {
    method: 'POST',
    body: JSON.stringify({
      ...req,
      root_dir: req.root_dir ?? null,
      selected_workflow: req.selected_workflow ?? null,
      rag_top_k: req.rag_top_k ?? 8
    })
  })
}

export type CotMode = 'risk' | 'missing'

export async function cotQuestion(req: {
  mode: CotMode
  item: string
  goal: string
  constraints: string
  subtasks: string
  risk_items: string[]
  missing_items: string[]
}) {
  return requestJson<{ ok: boolean; question?: string; error?: string }>('/py/cot/question', {
    method: 'POST',
    body: JSON.stringify(req)
  })
}

export async function cotRefine(req: {
  mode: CotMode
  item: string
  answer: string
  goal: string
  constraints: string
  subtasks: string
  risk_items: string[]
  missing_items: string[]
}) {
  return requestJson<{
    ok: boolean
    resolved: boolean
    goal: string
    constraints: string
    subtasks: string
    risk_items: string[]
    missing_items: string[]
    error?: string
  }>('/py/cot/refine', {
    method: 'POST',
    body: JSON.stringify(req)
  })
}

export async function cotGeneratePrompt(req: {
  goal: string
  constraints: string
  subtasks: string
  risk_items: string[]
  missing_items: string[]
  related_function_ids: string[]
  root_dir?: string | null
}) {
  return requestJson<{ ok: boolean; prompt?: string; used_function_ids?: string[]; error?: string }>(
    '/py/cot/generate-prompt',
    {
      method: 'POST',
      body: JSON.stringify({ ...req, root_dir: req.root_dir ?? null })
    }
  )
}

export async function orchestratorGenerate(req: {
  prompt: string
  source_event_id?: string | null
  source_event_type?: string | null
}) {
  return requestJson<{ ok: boolean; result?: string; key_points?: string[]; log?: string; error?: string }>(
    '/py/orchestrator/generate',
    {
      method: 'POST',
      body: JSON.stringify({
        prompt: req.prompt,
        source_event_id: req.source_event_id ?? null,
        source_event_type: req.source_event_type ?? null
      })
    }
  )
}

export async function orchestratorGenerateCode(req: {
  prompt: string
  source_event_id?: string | null
  source_event_type?: string | null
}) {
  const res = await requestJson<{ ok: boolean; result?: string; key_points?: string[]; log?: string; error?: string }>(
    '/py/orchestrator/generate',
    {
      method: 'POST',
      body: JSON.stringify({
        prompt: req.prompt,
        source_event_id: req.source_event_id ?? null,
        source_event_type: req.source_event_type ?? null
      })
    }
  )
  return { ok: res.ok, code: res.result, key_points: res.key_points, log: res.log, error: res.error }
}

export type GateStepType = 'compile' | 'static' | 'unit' | 'coverage'

export type GateJobStatus = {
  step: GateStepType
  status: 'queued' | 'running' | 'success' | 'failed'
  started_at?: string | null
  finished_at?: string | null
}

export async function gateStart(req: {
  work_dir: string
  compile_command: string
  static_command: string
  enable_unit: boolean
  enable_coverage: boolean
  requirement_prompt: string
  generated_result: string
  source_event_id?: string | null
  source_event_type?: string | null
}) {
  return requestJson<{ ok: boolean; job_id?: string; error?: string }>('/py/gate/start', {
    method: 'POST',
    body: JSON.stringify({
      ...req,
      source_event_id: req.source_event_id ?? null,
      source_event_type: req.source_event_type ?? null
    })
  })
}

export async function gateGetJob(job_id: string) {
  return requestJson<{ ok: boolean; job_id: string; stage: string; statuses: GateJobStatus[]; log_lines: string[]; done: boolean; error?: string }>(
    `/py/gate/jobs/${encodeURIComponent(job_id)}`
  )
}

export async function gateCancel(job_id: string) {
  return requestJson<{ ok: boolean }>(`/py/gate/jobs/${encodeURIComponent(job_id)}/cancel`, { method: 'POST' })
}
