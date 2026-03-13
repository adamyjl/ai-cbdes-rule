type GateStepType = 'compile' | 'static' | 'unit' | 'coverage';

export type FunctionIndexItem = {
  function_id: string;
  language: string;
  file_path: string;
  start_line: number;
  end_line: number;
  signature: string;
  display_name: string;
  module: string;
  module_source?: string;
  kind?: string;
  kind_source?: string;
  doc_zh: string;
  doc_en?: string;
  inputs_json?: string;
  outputs_json?: string;
  embedded: number;
  updated_at: string;
};

export type RagFunctionsResponse = {
  total: number;
  limit: number;
  offset: number;
  items: FunctionIndexItem[];
};

export type RagIndexedModuleItem = {
  module_key: string;
  root_dir: string;
  display_name: string;
  doc_zh: string;
  nodes_json?: string;
  edges_json?: string;
  inputs_json?: string;
  outputs_json?: string;
  node_count: number;
  edge_count: number;
  source: string;
  embedded: number;
  updated_at: string;
};

export type RagIndexedModulesResponse = {
  total: number;
  limit: number;
  offset: number;
  items: RagIndexedModuleItem[];
};

export type GateStepStatus = {
  step: GateStepType;
  status: 'queued' | 'running' | 'success' | 'failed';
  started_at?: string | null;
  finished_at?: string | null;
};

async function parseJsonOrText(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const u = resolveApiUrl(url);
  const res = await fetch(u, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'content-type': 'application/json'
    }
  });
  if (!res.ok) {
    const body = await parseJsonOrText(res);
    throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
  }
  return (await res.json()) as T;
}

async function requestFormData<T>(url: string, init?: RequestInit): Promise<T> {
  const u = resolveApiUrl(url);
  const res = await fetch(u, init);
  if (!res.ok) {
    const body = await parseJsonOrText(res);
    throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
  }
  return (await res.json()) as T;
}

function resolveApiUrl(url: string) {
  const raw = String(url || '');
  if (!raw.startsWith('/')) return raw;
  const envBase = String((import.meta as any).env?.VITE_API_ORIGIN || '').trim().replace(/\/+$/, '');

  if (envBase) return `${envBase}${raw}`;
  return raw;
}

export async function healthPython() {
  return requestJson<{ ok: boolean }>('/py/health');
}

export async function ragScan(root_dir: string) {
  return requestJson<{ root_dir: string; scanned: boolean; files: number; functions: number }>('/py/rag/scan', {
    method: 'POST',
    body: JSON.stringify({ root_dir })
  });
}

export async function ragListFunctions(params: {
  root_dir?: string;
  q?: string;
  module?: string;
  kind?: string;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams();
  if (params.root_dir) qs.set('root_dir', params.root_dir);
  if (params.q) qs.set('q', params.q);
  if (params.module) qs.set('module', params.module);
  if (params.kind) qs.set('kind', params.kind);
  qs.set('limit', String(params.limit ?? 200));
  qs.set('offset', String(params.offset ?? 0));
  return requestJson<RagFunctionsResponse>(`/py/rag/functions?${qs.toString()}`);
}

export async function ragListIndexedModules(params: { root_dir?: string; q?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params.root_dir) qs.set('root_dir', params.root_dir);
  if (params.q) qs.set('q', params.q);
  qs.set('limit', String(params.limit ?? 200));
  qs.set('offset', String(params.offset ?? 0));
  return requestJson<RagIndexedModulesResponse>(`/py/rag/indexed-modules?${qs.toString()}`);
}

export async function ragGetModule(module_key: string) {
  return requestJson<{ ok: boolean; module?: RagIndexedModuleItem; error?: string }>(
    `/py/rag/module?module_key=${encodeURIComponent(module_key)}`
  );
}

export async function ragGetFunction(function_id: string) {
  return requestJson<any>(`/py/rag/function?function_id=${encodeURIComponent(function_id)}`);
}

export async function ragUploadCodeFiles(params: { files: Array<{ file: File; relativePath: string }>; upload_id?: string }) {
  const fd = new FormData();
  if (params.upload_id) fd.append('upload_id', params.upload_id);
  for (const it of params.files) {
    fd.append('files', it.file, it.relativePath);
  }
  return requestFormData<{ ok: boolean; upload_id: string; root_dir: string; files_total: number; files_saved: number; files_skipped: number; bytes: number }>(
    '/py/rag/upload',
    {
      method: 'POST',
      body: fd
    }
  );
}

export type RagIndexJobStatus = {
  job_id: string;
  root_dir: string;
  enrich: boolean;
  max_functions: number | null;
  stage: string;
  started_at: string;
  updated_at: string;
  total_files: number;
  processed_files: number;
  current_file: string | null;
  total_functions: number;
  processed_functions: number;
  total_embeddings: number;
  processed_embeddings: number;
  percent: number;
  error: string | null;
  canceled: boolean;
};

export type RagBackfillDocsJob = {
  job_id: string;
  root_dir: string | null;
  stage: string;
  started_at: string;
  updated_at: string;
  total: number;
  processed: number;
  percent: number;
  current_file: string | null;
  current_function_id: string | null;
  error: string | null;
  canceled: boolean;
};

export type RagKindJobStatus = {
  job_id: string;
  root_dir: string | null;
  stage: string;
  started_at: string;
  updated_at: string;
  total: number;
  processed: number;
  percent: number;
  current_function_id: string | null;
  current_file: string | null;
  error: string | null;
  canceled: boolean;
};

export type RagModuleIndexJobStatus = {
  job_id: string;
  root_dir: string;
  stage: string;
  started_at: string;
  updated_at: string;
  total_modules: number;
  processed_modules: number;
  current_module: string | null;
  percent: number;
  error: string | null;
  canceled: boolean;
};

export async function ragStartIndexJob(root_dir: string, opts?: { enrich?: boolean; max_functions?: number | null }) {
  return requestJson<{ ok: boolean; job_id: string }>('/py/rag/index-job', {
    method: 'POST',
    body: JSON.stringify({
      root_dir,
      enrich: opts?.enrich ?? true,
      max_functions: opts?.max_functions ?? null
    })
  });
}

export async function ragGetIndexJob(job_id: string) {
  return requestJson<{ ok: boolean; job?: RagIndexJobStatus; error?: string }>(`/py/rag/index-job/${encodeURIComponent(job_id)}`);
}

export async function ragCancelIndexJob(job_id: string) {
  return requestJson<{ ok: boolean }>(`/py/rag/index-job/${encodeURIComponent(job_id)}/cancel`, { method: 'POST' });
}

export async function ragStartBackfillDocsJob(root_dir?: string | null, limit?: number) {
  return requestJson<{ ok: boolean; job_id: string }>('/py/rag/backfill-docs-job', {
    method: 'POST',
    body: JSON.stringify({ root_dir: root_dir ?? null, limit: limit ?? 2000 })
  });
}

export async function ragGetBackfillDocsJob(job_id: string) {
  return requestJson<{ ok: boolean; job?: RagBackfillDocsJob; error?: string }>(`/py/rag/backfill-docs-job/${encodeURIComponent(job_id)}`);
}

export async function ragCancelBackfillDocsJob(job_id: string) {
  return requestJson<{ ok: boolean }>(`/py/rag/backfill-docs-job/${encodeURIComponent(job_id)}/cancel`, { method: 'POST' });
}

export async function ragStartKindJob(root_dir?: string | null) {
  return requestJson<{ ok: boolean; job_id: string }>('/py/rag/kind-job', {
    method: 'POST',
    body: JSON.stringify({ root_dir: root_dir ?? null })
  });
}

export async function ragGetKindJob(job_id: string) {
  return requestJson<{ ok: boolean; job?: RagKindJobStatus; error?: string }>(`/py/rag/kind-job/${encodeURIComponent(job_id)}`);
}

export async function ragCancelKindJob(job_id: string) {
  return requestJson<{ ok: boolean }>(`/py/rag/kind-job/${encodeURIComponent(job_id)}/cancel`, { method: 'POST' });
}

export async function ragStartModuleIndexJob(root_dir: string) {
  return requestJson<{ ok: boolean; job_id: string }>('/py/rag/module-index-job', {
    method: 'POST',
    body: JSON.stringify({ root_dir })
  });
}

export async function ragGetModuleIndexJob(job_id: string) {
  return requestJson<{ ok: boolean; job?: RagModuleIndexJobStatus; error?: string }>(`/py/rag/module-index-job/${encodeURIComponent(job_id)}`);
}

export async function ragCancelModuleIndexJob(job_id: string) {
  return requestJson<{ ok: boolean }>(`/py/rag/module-index-job/${encodeURIComponent(job_id)}/cancel`, { method: 'POST' });
}

export async function ragEnrichFunction(function_id: string, root_dir?: string | null) {
  return requestJson<{ ok: boolean; function?: any; error?: string }>('/py/rag/function/enrich', {
    method: 'POST',
    body: JSON.stringify({ function_id, root_dir: root_dir ?? null })
  });
}

export async function ragRepairModuleFromPath(root_dir?: string | null) {
  return requestJson<{ ok: boolean; updated?: number; error?: string }>('/py/rag/repair-module-from-path', {
    method: 'POST',
    body: JSON.stringify({ root_dir: root_dir ?? null })
  });
}

export async function ragSaveFunctionSource(req: {
  function_id: string;
  new_code: string;
  write_file?: boolean;
  root_dir?: string | null;
  re_enrich?: boolean;
}) {
  return requestJson<{ ok: boolean; function?: any; error?: string }>('/py/rag/function/source', {
    method: 'PUT',
    body: JSON.stringify({
      function_id: req.function_id,
      new_code: req.new_code,
      write_file: req.write_file ?? true,
      root_dir: req.root_dir ?? null,
      re_enrich: req.re_enrich ?? false
    })
  });
}

export async function ragDeleteFunctions(function_ids: string[]) {
  return requestJson<{ ok: boolean; deleted: number }>('/py/rag/functions/delete', {
    method: 'POST',
    body: JSON.stringify({ function_ids })
  });
}

export async function ragDeleteModules(module_keys: string[]) {
  return requestJson<{ ok: boolean; deleted: number }>('/py/rag/modules/delete', {
    method: 'POST',
    body: JSON.stringify({ module_keys })
  });
}

export async function ragQuery(query: string, top_k: number, module?: string | null) {
  return requestJson<{ query: string; hits: any[]; latency_ms: number }>('/py/rag/query', {
    method: 'POST',
    body: JSON.stringify({ query, top_k, module: module ?? null })
  });
}

export type RagModuleHit = {
  module_key: string;
  display_name?: string;
  score: number;
};

export async function ragQueryModules(query: string, top_k: number) {
  return requestJson<{ hits: RagModuleHit[] }>('/py/rag/query-modules', {
    method: 'POST',
    body: JSON.stringify({ query, top_k })
  });
}

export async function ragRunTest(req: { cwd: string; command: string; timeout_ms?: number }) {
  return requestJson<{ ok: boolean; returncode: number; stdout: string; stderr: string; duration_ms: number }>('/py/rag/test-run', {
    method: 'POST',
    body: JSON.stringify({ cwd: req.cwd, command: req.command, timeout_ms: req.timeout_ms ?? 60000 })
  });
}

export type TaskAnalyzeResponse = {
  ok: boolean;
  debug_id?: string;
  analysis_markdown?: string;
  analysis_struct?: {
    goal?: string;
    constraints?: string;
    subtasks?: string;
    risk_items?: string[];
    missing_items?: string[];
  };
  llm_model?: string;
  rag_query?: string;
  rag_hits?: Array<{
    function_id: string;
    name: string;
    module: string;
    score: number;
    file_path?: string;
    signature?: string;
    doc_zh?: string;
  }>;
  error?: string;
};

export type CotQuestionResponse = {
  ok: boolean;
  question?: string;
  error?: string;
};

export type CotRefineResponse = {
  ok: boolean;
  resolved: boolean;
  goal: string;
  constraints: string;
  subtasks: string;
  risk_items: string[];
  missing_items: string[];
  error?: string;
};

export async function taskAnalyze(req: {
  target_module: string;
  intent: string;
  feature_description: string;
  input_spec: string;
  output_spec: string;
  generation_question: string;
  selected_function_ids: string[];
  selected_workflow?: string | null;
  root_dir?: string | null;
  rag_top_k?: number;
}) {
  return requestJson<TaskAnalyzeResponse>('/py/task/analyze', {
    method: 'POST',
    body: JSON.stringify(req)
  });
}

export async function cotQuestion(req: {
  mode: 'risk' | 'missing';
  item: string;
  goal?: string;
  constraints?: string;
  subtasks?: string;
  risk_items?: string[];
  missing_items?: string[];
}) {
  return requestJson<CotQuestionResponse>('/py/cot/question', {
    method: 'POST',
    body: JSON.stringify(req)
  });
}

export async function cotRefine(req: {
  mode: 'risk' | 'missing';
  item: string;
  answer: string;
  goal?: string;
  constraints?: string;
  subtasks?: string;
  risk_items?: string[];
  missing_items?: string[];
}) {
  return requestJson<CotRefineResponse>('/py/cot/refine', {
    method: 'POST',
    body: JSON.stringify(req)
  });
}

export async function cotGeneratePrompt(req: {
  goal: string;
  constraints: string;
  subtasks: string;
  risk_items: string[];
  missing_items: string[];
  related_function_ids: string[];
  root_dir?: string | null;
}) {
  return requestJson<{ prompt: string }>('/py/cot/generate-prompt', {
    method: 'POST',
    body: JSON.stringify(req)
  });
}

export async function ragUpsertModule(req: { root_dir: string; module: any }) {
  return requestJson<{ ok: boolean; module?: RagIndexedModuleItem; error?: string }>('/py/rag/module', {
    method: 'PUT',
    body: JSON.stringify({ root_dir: req.root_dir, module: req.module })
  });
}

export async function orchestratorGenerate(prompt: string) {
  return requestJson<{ ok: boolean; result?: string; error?: string }>('/py/orchestrator/generate', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      source_event_id: null,
      source_event_type: null
    })
  });
}

export async function orchestratorGenerateCode(prompt: string) {
  return requestJson<{ ok: boolean; code?: string; error?: string }>('/py/orchestrator/generate-code', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      source_event_id: null,
      source_event_type: null
    })
  });
}

export async function codegenGlue(req: { task?: string; from_node: any; to_node: any }) {
  return requestJson<{ ok: boolean; glue_name?: string; doc_zh?: string; inputs_json?: any; outputs_json?: any; glue_code?: string; error?: string }>(
    '/py/codegen/glue',
    {
      method: 'POST',
      body: JSON.stringify(req)
    }
  );
}

export async function codegenGlueCpp(req: {
  task?: string;
  from_node: any;
  to_node: any;
  from_code?: string;
  to_code?: string;
  cpp_rules?: string;
}) {
  const call = (path: string) =>
    requestJson<{
      ok: boolean;
      function_name?: string;
      display_name?: string;
      signature?: string;
      doc_zh?: string;
      inputs_json?: any;
      outputs_json?: any;
      code?: string;
      error?: string;
    }>(path, {
      method: 'POST',
      body: JSON.stringify(req)
    });

  try {
    return await call('/py/codegen/glue-cpp');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e || '');
    if (msg.includes('Not Found') || msg.includes('not found') || msg.includes('404')) {
      try {
        return await call('/py/codegen/glue_cpp');
      } catch (e2) {
        const msg2 = e2 instanceof Error ? e2.message : String(e2 || '');
        if (!(msg2.includes('Not Found') || msg2.includes('not found') || msg2.includes('404'))) throw e2;

        const prompt = [
          '你是智能驾驶基础软件的胶水函数生成器。',
          '请根据上下游节点的输入输出规范，生成一个中间转换节点的 C++ 胶水函数。',
          '',
          '关键约束：',
          '- 只生成一个 C++ 函数（不要输出多个函数，不要输出 main，不要输出类/模板）。',
          '- 允许必要的 #include 与 Doxygen 注释。',
          '- 函数输入应匹配 from_node.outputs_json；函数输出应匹配 to_node.inputs_json。',
          '- 实现字段映射与必要的类型转换；无法严格转换时用 TODO 标注，但代码需可编译。',
          '- 必须严格遵守附带的【C++代码改写统一规范】。',
          '',
          `用户胶水需求：${String(req.task || '').trim()}`,
          '',
          '上游节点（from_node）：',
          JSON.stringify(req.from_node ?? {}, null, 2),
          '',
          '下游节点（to_node）：',
          JSON.stringify(req.to_node ?? {}, null, 2),
          '',
          '上游函数源代码（from_code）：',
          String(req.from_code || '').slice(0, 12000),
          '',
          '下游函数源代码（to_code）：',
          String(req.to_code || '').slice(0, 12000),
          '',
          '【C++代码改写统一规范（必须严格遵守）】',
          String(req.cpp_rules || '').trim(),
        ].join('\n');

        const out = await orchestratorGenerateCode(prompt);
        if (!out?.ok) throw new Error(String((out as any)?.error || '生成胶水函数失败'));
        const md = String((out as any)?.code || '').trim();
        const m3 = /```(?:cpp|c\+\+|c)\s*\n([\s\S]*?)\n```/i.exec(md);
        const code = String(m3?.[1] || md).trim();
        const sigLine = code
          .replace(/\r\n/g, '\n')
          .split('\n')
          .map((l) => l.trim())
          .find((l) => l.includes('(') && l.includes(')') && l.includes('{') && !l.startsWith('#'));
        const fnName = (() => {
          const s = String(sigLine || '');
          const m = /\b([A-Za-z][A-Za-z0-9]*)\s*\(/.exec(s);
          return String(m?.[1] || 'glueConvert');
        })();
        return {
          ok: true,
          function_name: fnName,
          display_name: '格式转换胶水',
          signature: sigLine || `void ${fnName}()`,
          doc_zh: '',
          inputs_json: (req as any)?.from_node?.outputs_json ?? {},
          outputs_json: (req as any)?.to_node?.inputs_json ?? {},
          code
        };
      }
    }
    throw e;
  }
}

export async function releaseRagIndex(req: { version: string; functions: any[] }) {
  return requestJson<{ ok: boolean; error?: string; upserted?: number; version?: string }>('/py/release/rag-index', {
    method: 'POST',
    body: JSON.stringify(req)
  });
}

export async function releaseModulesUpsert(req: { version: string; namespace: string; functions: any[] }) {
  return requestJson<{ ok: boolean; error?: string; upserted?: number; version?: string; namespace?: string }>(
    '/py/release/modules-upsert',
    {
      method: 'POST',
      body: JSON.stringify(req)
    }
  );
}

export async function gateStart(req: {
  work_dir: string;
  compile_command: string;
  static_command: string;
  requirement_prompt: string;
  generated_result: string;
}) {
  return requestJson<{ ok: boolean; job_id?: string; error?: string }>('/py/gate/start', {
    method: 'POST',
    body: JSON.stringify({
      ...req,
      enable_unit: true,
      enable_coverage: true,
      source_event_id: null,
      source_event_type: null
    })
  });
}

export async function gateGetJob(job_id: string) {
  return requestJson<{ ok: boolean; stage: string; statuses: GateStepStatus[]; log_lines: string[]; done: boolean; error?: string }>(
    `/py/gate/jobs/${encodeURIComponent(job_id)}`
  );
}
