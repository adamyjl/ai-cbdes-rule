# API 参考（FastAPI / Express）

本文档整理当前仓库可运行实现的接口面（以代码为准），便于前端（Rule / MLLM / GAASD）对接与排障。

约定：

- 部署态对外通过 Caddy 同域提供：
  - `/py/*` → FastAPI（核心能力）
  - `/api/*` → Express（占位/健康检查）
- 开发态（Vite）同样使用上述前缀，保证开发/生产一致。

---

## 1. Health

### GET `/py/health`

- 说明：FastAPI 健康检查
- 返回：`{ "ok": true }`

### GET `/api/health`

- 说明：Express 健康检查占位
- 返回：`{ "ok": true }`

---

## 2. RAG（函数资产） `/py/rag/*`

代码位置：`app/backend/app/routers/rag.py`

### POST `/py/rag/upload`

- 说明：上传代码文件到后端数据目录（用于后续 scan/index）
- 请求：`multipart/form-data`
  - `files`: 多个文件字段（文件名视为相对路径，会做安全清洗）
  - `upload_id`（可选）：复用同一次上传目录
- 返回（示例字段）：
  - `ok`、`upload_id`、`root_dir`、`files_total/files_saved/files_skipped`、`bytes`

### POST `/py/rag/scan`

- 说明：扫描 `root_dir`，返回文件/函数统计与预览
- 请求：JSON `{ root_dir: string, max_preview?: number }`

### POST `/py/rag/index`

- 说明：同步索引（可能耗时；生产更推荐 index-job）
- 请求：JSON `{ root_dir: string, enrich: boolean, max_functions?: number | null }`

### POST `/py/rag/index-job`

- 说明：异步索引 job
- 请求：同 `/index`
- 返回：`{ ok: boolean, job_id: string }`

### GET `/py/rag/index-job/{job_id}`

- 说明：查询索引 job 进度
- 返回：`{ ok, job?, error? }`（job 包含 stage/percent/current_file/processed_* 等）

### POST `/py/rag/index-job/{job_id}/cancel`

- 说明：取消索引 job
- 返回：`{ ok: boolean }`

### POST `/py/rag/backfill-docs-job`

- 说明：批量补全 `doc_zh` 的异步任务
- 请求：JSON `{ root_dir?: string | null, limit?: number }`
- 返回：`{ ok, job_id }`

### GET `/py/rag/backfill-docs-job/{job_id}`

- 说明：查询补全文档 job

### POST `/py/rag/backfill-docs-job/{job_id}/cancel`

- 说明：取消补全 job

### POST `/py/rag/kind-job`

- 说明：批量识别/修复函数 kind 的异步任务
- 请求：JSON `{ root_dir?: string | null }`

### GET `/py/rag/kind-job/{job_id}` / POST `/py/rag/kind-job/{job_id}/cancel`

- 说明：查询/取消 kind job

### POST `/py/rag/function/enrich`

- 说明：对单个函数立即 enrich（生成/修复中文说明、I/O JSON 等）
- 请求：JSON `{ function_id: string, root_dir?: string | null }`

### POST `/py/rag/query`

- 说明：相似度检索（embedding）
- 请求：JSON `{ query: string, top_k: number, module?: string | null }`
- 返回：`{ hits: [...] }`

### GET `/py/rag/functions`

- 说明：列表查询函数资产
- Query：`root_dir? module? kind? q? limit? offset?`

### GET `/py/rag/function`

- 说明：获取函数详情（含源码、签名、doc_zh、inputs/outputs_json 等）
- Query：`function_id=...`

### PUT `/py/rag/function/source`

- 说明：保存函数源码（可选写回文件）
- 请求：JSON `{ function_id, new_code, write_file?: boolean, root_dir?: string | null, re_enrich?: boolean }`

### POST `/py/rag/test-run`

- 说明：后端代执行命令（用于门禁/自测等）
- 请求：JSON `{ cwd: string, command: string, timeout_ms?: number }`

### POST `/py/rag/functions/delete` / POST `/py/rag/functions/delete-by-root`

- 说明：批量删除函数资产（按 function_ids 或按 root_dir）

### GET `/py/rag/status`

- 说明：RAG 状态统计（embedded 数量等）

### POST `/py/rag/rebase-paths`

- 说明：将历史索引记录中的路径做一次性 rebase（跨机器迁移时使用）

### GET `/py/rag/default-root`

- 说明：默认示例代码根目录

### 模块索引与模块资产

#### POST `/py/rag/module-index-job` / GET `/py/rag/module-index-job/{job_id}` / POST `/py/rag/module-index-job/{job_id}/cancel`

- 说明：模块索引异步任务（从函数资产聚合出模块）

#### GET `/py/rag/indexed-modules`

- 说明：列表查询已索引模块
- Query：`root_dir? q? limit? offset?`

#### GET `/py/rag/module`

- 说明：获取模块详情
- Query：`module_key=...`

#### PUT `/py/rag/module`

- 说明：写入/更新模块资产（nodes_json/edges_json/inputs_json/outputs_json 等）
- 请求：JSON `{ root_dir: string, module: dict }`

#### POST `/py/rag/modules/delete`

- 说明：批量删除模块资产
- 请求：JSON `{ module_keys: string[] }`

#### POST `/py/rag/publish-module`

- 说明：从画布图（graph）发布/生成模块资产（含相似模块匹配）
- 请求（核心字段）：`{ root_dir, graph, module_key?, display_name_hint?, source?, similarity_threshold? }`

---

## 3. Task（任务分析） `/py/task/*`

代码位置：`app/backend/app/routers/task.py`

### POST `/py/task/analyze`

- 说明：对结构化需求做分析，生成 Markdown、推荐检索 query、候选函数命中等
- 请求：`TaskAnalyzeRequest`（target_module/intent/description/feature_description/input_spec/output_spec/generation_question/selected_function_ids/...）
- 返回：`{ ok, analysis_markdown?, rag_query?, rag_hits?, error? }`

---

## 4. COT（消歧与提示词拼装） `/py/cot/*`

代码位置：`app/backend/app/routers/cot.py`

### POST `/py/cot/question`

- 说明：生成澄清问题（按 risk/missing/ambiguity 模式）

### POST `/py/cot/refine`

- 说明：根据回答更新 goal/constraints/subtasks/risk_items/missing_items

### POST `/py/cot/generate-prompt`

- 说明：拼装最终提示词（附带相关函数源码附录）

### POST `/py/cot/orchestrator-generate`

- 说明：兼容入口：先走 cot 再触发 orchestrator 生成（当前直接转发）

---

## 5. Orchestrator（编排/生成） `/py/orchestrator/*`

代码位置：`app/backend/app/routers/orchestrator.py`

### POST `/py/orchestrator/generate`

- 说明：根据 prompt 生成（返回关键要点与文本结果）

### POST `/py/orchestrator/generate-code`

- 说明：生成 C++ 代码（面向代码产物）

---

## 6. Gate（门禁） `/py/gate/*`

代码位置：`app/backend/app/routers/gate.py`

### POST `/py/gate/start`

- 说明：启动门禁 job（compile/static/unit/coverage）
- 请求：`{ work_dir, compile_command, static_command, enable_unit, enable_coverage, requirement_prompt, generated_result }`
- 返回：`{ ok, job_id, error? }`

### GET `/py/gate/jobs/{job_id}`

- 说明：轮询门禁 job 状态与日志

### POST `/py/gate/jobs/{job_id}/cancel`

- 说明：取消门禁 job

---

## 7. Release（发布） `/py/release/*`

代码位置：`app/backend/app/routers/release.py`

### POST `/py/release/rag-index`

- 说明：写入发布版本的函数资产快照

### POST `/py/release/modules-upsert`

- 说明：写入发布版本的模块快照（namespace 分区）

---

## 8. Archive（档案事件流） `/py/archive/*`

代码位置：`app/backend/app/routers/archive.py`

### POST `/py/archive/events`

- 说明：追加事件（JSONL），用于追溯与回放
- 请求：`{ type: string, payload: object }`

### GET `/py/archive/events?limit=50`

- 说明：读取最近 N 条事件

### GET `/py/archive/events/{event_id}`

- 说明：读取单条事件

---

## 9. Codegen（补丁式生成） `/py/codegen/*`

代码位置：`app/backend/app/routers/codegen.py`

### POST `/py/codegen/plan`

- 说明：根据 requirement 生成 plan（Markdown）

### POST `/py/codegen/generate`

- 说明：根据 plan 生成 patch diff

### POST `/py/codegen/glue`

- 说明：为两节点之间自动生成 glue（用于图形化搭建自动补全）

