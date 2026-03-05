# 系统设计说明

本文档以当前仓库的“可运行实现”为准，结合现有技术方案、页面交互与实际持久化数据形态，描述系统架构、数据模型与端到端使用流程。

## 1. 系统目标与边界

**目标**：面向“智能驾驶基础软件”的代码生产线原型，把既有代码资产（函数粒度）通过 RAG 管理成可检索库，再将需求结构化为任务卡，经“消歧 → 编排 → 生成 → 门禁 → 发布 → 归档”形成可追溯闭环。

**边界**：

- 当前 RAG 索引依赖本机文件系统读取代码目录，因此默认以“本地/单机部署”形态运行。
- 数据存储以本地持久化为主：SQLite（RAG）、JSONL（档案事件流）、JSON（发布模块库）、文件夹（门禁工作区）。

## 2. 可运行架构

### 2.1 组件与职责

- **前端（React/Vite）**：页面交互、提示词拼装、调度后端 API、浏览器侧草稿与档案缓存。
- **后端（FastAPI）**：RAG 扫描/索引/检索、档案事件流、任务分析、消歧问答与最终提示词生成、编排生成、门禁流水线 Job、发布与回写。
- **辅助 API（Express）**：当前仅 `/api/health` 健康检查，占位扩展。
- **部署入口（Caddy）**：部署态统一提供静态站点与反向代理 `/py/*`、`/api/*`。

关键入口：

- 前端路由：[app/src/App.tsx](../src/App.tsx)
- FastAPI 入口：[app/backend/app/main.py](../backend/app/main.py)
- 后端路由目录：[app/backend/app/routers](../backend/app/routers)
- 前端 API Client：[app/src/utils/api.ts](../src/utils/api.ts)

### 2.2 网络路径（开发态/部署态）

**开发态（Vite 代理）**见 [app/vite.config.cjs](../vite.config.cjs)：

- `/py/*` → `http://127.0.0.1:8000/*`（FastAPI）
- `/api/*` → `http://127.0.0.1:3001/*`（Express）

**部署态（Caddy）**见 [app/.runtime/Caddyfile](../.runtime/Caddyfile)：

- `/`：静态站点（`app/dist`）
- `/mllm`：MLLM 工作台（主前端路由），说明见 [MLLM_WEB.md](./MLLM_WEB.md)
- `/py/*`：反代 FastAPI
- `/api/*`：反代 Express

## 3. 数据与持久化（“数据库”实际形态）

### 3.1 数据目录

统一数据目录由 `AI_CBDES_DATA_DIR` 控制；未设置时使用系统默认目录（Windows：`LOCALAPPDATA/ai-cbdes-rule/data`）。实现见：[data_dir.py](../backend/app/services/data_dir.py)。

该目录下的关键持久化：

- `archive.jsonl`：档案事件流（JSON Lines）
- `rag.sqlite3`：RAG 索引库（SQLite）
- `release_modules.json`：发布模块库（JSON 数组）
- `gate-workspaces/`：门禁工作区（每次门禁生成一个隔离目录）

### 3.2 档案事件流：`archive.jsonl`

后端以“追加写”方式记录事件；启动时会加载到内存，用于快速列表查询。实现见：[archive_service.py](../backend/app/services/archive_service.py)。

事件的最小结构：

```json
{"id":"uuid","type":"event.type","payload":{},"ts":"2026-02-09T00:00:00+00:00"}
```

典型事件类型（与页面闭环对应）：

- `rag.query`：离线检索（便于回放检索输入/输出）
- `task.analyze`：任务分析（含分析 markdown、推荐 query、rag_hits）
- `cot.disambiguation`：路由消歧结果（目标/约束/子任务/问答记录、最终提示词片段等）
- `orchestrator.generate`：编排生成（prompt、生成代码、key_points、log）
- `gate.run`：测试门禁（输入源、compile/static/unit/coverage 证据链与结论）
- `release.publish`：发布（版本、产物拆分、回写索引结果）

说明：前端也会将档案做浏览器侧缓存（Zustand + localStorage），减少频繁拉取；点击“刷新档案”才会拉取远端并合并更新。实现见：[archiveStore.ts](../src/store/archiveStore.ts)。

### 3.3 RAG 索引库：`rag.sqlite3`

RAG Store 使用 SQLite 存函数资产与模块资产，并把 embedding 以 `float32` 数组序列化为 `BLOB` 存储。表结构来自：[rag_store.py](../backend/app/services/rag_store.py)。

#### 3.3.1 `functions` 表（函数资产）

关键字段（节选）：

- `function_id`：主键
- `language/file_path/start_line/end_line/signature/code`
- `display_name/module/module_source`
- `kind/kind_source`：函数类别（如 glue）
- `doc_zh/doc_en`：说明
- `inputs_json/outputs_json`：结构化 IO
- `embedding/embedding_dim`：向量
- `updated_at`

#### 3.3.2 `modules` 表（模块资产）

关键字段（节选）：

- `module_key`：主键
- `root_dir`：所属代码根目录
- `display_name/doc_zh/doc_en/inputs_json/outputs_json`
- `nodes_json/edges_json`：模块内的函数/连接关系（用于图形化搭建与复现）
- `source`：来源（discovered / visual-builder / release 等）
- `embedding/embedding_dim/updated_at`

### 3.4 发布模块库：`release_modules.json`

发布阶段会把“门禁通过”的产物按版本写入发布模块库，便于后续查阅/回放。实现见：[release_module_store.py](../backend/app/services/release_module_store.py)。

该文件是一个 JSON 数组，元素至少包含：

- `module_key`：模块标识
- `version`：发布版本
- `created_at/updated_at`
- 以及发布时写入的模块元数据（由发布页决定）

### 3.5 门禁工作区：`gate-workspaces/`

门禁将生成结果“落盘成一个可编译的临时工程”，执行 compile/static/unit/coverage 并收集日志。工作区创建与落盘见：[gate_workspace.py](../backend/app/services/gate_workspace.py)。

工作区内通常包含：

- 从 Markdown 解析得到的多文件源码（按 `### path` 片段落盘）
- 门禁脚本（编译/静态分析/单测/覆盖率）与工程 scaffold
- 日志与结果（由 gate job 汇总后写回档案）

## 4. 页面交互与后端 API 对齐

### 4.1 页面路由（前端）

前端按 Offline/Online 组织：路由汇总见 [app/src/App.tsx](../src/App.tsx)。

Offline（示例）：

- `/offline/rag`：RAG 管理（扫描/索引/检索/模块索引）
- `/offline/archive`：档案管理

Online（核心闭环）：

- `/online/task`：任务输入（结构化需求）
- `/online/routing`：路由消歧（问答收敛目标/约束）
- `/online/orchestration`：函数编排与生成（拼装最终提示词并生成代码）
- `/online/testing`：测试门禁（compile/static/unit/coverage）
- `/online/release`：发布（只允许门禁通过的输入）

可选能力：

- `/visual-builder`：图形化输入（拖拽函数/模块并导出提示词与代码；导出结果已持久化到草稿 localStorage）

### 4.2 后端路由分层

后端路由入口位于 [routers](../backend/app/routers)。常用接口：

- `/rag/*`：扫描/索引/检索/编辑/模块索引任务（见 [rag.py](../backend/app/routers/rag.py)）
- `/archive/events`：追加/查询档案（见 [archive.py](../backend/app/routers/archive.py)）
- `/task/analyze`：任务分析（见 [task.py](../backend/app/routers/task.py)）
- `/cot/*`：消歧问答与最终提示词生成（见 [cot.py](../backend/app/routers/cot.py)）
- `/orchestrator/*`：编排生成（见 [orchestrator.py](../backend/app/routers/orchestrator.py)）
- `/gate/*`：门禁 job（见 [gate.py](../backend/app/routers/gate.py)）
- `/release/*`：发布与回写索引（见 [release.py](../backend/app/routers/release.py)）

## 5. 端到端使用流程（建议路径）

下面以“从零跑通一次闭环”为例：

### 5.1 初始化（一次性）

1. 配置数据目录（可选，但推荐）：设置 `AI_CBDES_DATA_DIR` 指向独立磁盘目录。
2. 配置模型调用（必要）：设置 `ALIYUN_API_KEY`（FastAPI 会用 OpenAI SDK 调用百炼兼容网关）。
3. 启动服务：按根目录 README 启动前端与 FastAPI。

### 5.2 Offline：把代码库变成可检索资产

1. 进入“离线 / RAG 管理”。
2. 设置代码根目录（默认尝试 `./data/THICV-Pilot_master`）。
3. 执行扫描与索引：函数切分 →（可选）LLM 生成 `display_name/doc_zh` 等 → embedding 入库（`rag.sqlite3`）。
4. 验证检索：使用 Query 检索并查看函数详情，必要时编辑/补全结构化 IO。

### 5.3 Online：需求到代码的可追溯流水线

本系统目前存在两条在线闭环：

- 流程 1：**消歧 → 编排 → 生成 → 门禁 → 发布 → 归档**（原有主闭环）
- 流程 2：**函数 → 模块 → 搭建 → 图形化 → 导出 → 检测 → 归档**（图形化搭建闭环）

#### 5.3.1 流程 1：消歧 → 编排 → 生成 → 门禁 → 发布 → 归档

1. 消歧（Online / 路由消歧，`/online/routing`）
   - 输入：来自“任务输入/任务分析”的结构化目标、约束、子任务与风险点（通常先完成 `task.analyze`）。
   - 交互：对缺失信息/歧义点进行问答，收敛目标与约束。
   - 后端 API：`/py/cot/*`。
   - 落盘：写入档案事件 `cot.disambiguation` → `archive.jsonl`（payload 内包含收敛后的目标/约束/子任务与问答记录，用于可追溯复现）。

2. 编排（Online / 函数编排与生成，`/online/orchestration`）
   - 输入：从档案选择 `cot.disambiguation` 作为输入源。
   - 交互：生成最终提示词（把目标/约束/子任务 + RAG 关联函数源码附录整合为 prompt）。
   - 后端 API：`/py/orchestrator/generate`（提示词在后端会追加 C++ 统一规范）。
   - 落盘：写入档案事件 `orchestrator.generate`（payload 通常包含 `prompt`、`code`、`key_points`、`log`）。

3. 生成（同 2 步触发）
   - 产物：Markdown 多文件格式（`### relative/path` + code block），便于门禁落盘工程化。
   - 重要约束：生成结果必须能“落盘成多文件工程”；若缺少头文件/工程结构不完整，将在门禁阶段暴露。

4. 门禁（Online / 测试门禁，`/online/testing`）
   - 输入：从档案选择 `orchestrator.generate` 作为输入源。
   - 交互：启动门禁 job，轮询 job 状态，展示 compile/static/unit/coverage 四步结果。
   - 后端 API：`/py/gate/start`、`/py/gate/jobs/{job_id}`。
   - 落盘：
     - 工作区：`{data_dir}/gate-workspaces/gate_<id>/...`（写入拆分后的源码 + scaffold + 脚本 + 日志）。
     - 档案：写入 `gate.run`（证据链摘要、关键日志、是否通过）。

5. 发布（Online / 发布，`/online/release`）
   - 输入：只允许选择“门禁通过”的 `gate.run` 作为发布源。
   - 交互：可选进行产物切分（函数级）并回写 RAG/发布库。
   - 后端 API：`/py/release/rag-index`、`/py/release/modules-upsert`。
   - 落盘：
     - 发布库：`{data_dir}/release_modules.json`（按 `module_key` upsert，支持按 `version` 查询）。
     - 档案：写入 `release.publish`（版本、回写结果、发布摘要）。

6. 归档（贯穿全流程）
   - 归档介质：`{data_dir}/archive.jsonl`。
   - 归档内容：每一步的输入/输出与关键证据（尤其是 prompt、生成源码、门禁日志摘要、发布版本信息）。

#### 5.3.2 流程 2：函数 → 模块 → 搭建 → 图形化 → 导出 → 检测 → 归档

该流程的核心是用“图形化输入”页面把函数资产组织成模块/工作流，并一键导出用于生成与门禁。

1. 函数（Offline / RAG 管理，`/offline/rag`）
   - 目标：把本地代码库切分为可检索的函数资产。
   - 结果：函数资产写入 `rag.sqlite3.functions`，包含 `code/doc_zh/inputs_json/outputs_json/embedding` 等。

2. 模块（Offline / RAG 管理 或 Online / 图形化输入）
   - 模块资产落盘：写入 `rag.sqlite3.modules`，其中 `nodes_json/edges_json` 存模块内节点与连线。
   - 模块来源：可来自自动发现（discovered），也可来自图形化搭建发布（visual-builder）。

3. 搭建 & 图形化（Online / 图形化输入，`/visual-builder`）
   - 交互：拖拽函数/模块到画布，配置节点参数与结构化 IO（inputs/outputs），连线表达调用前后关系。
   - 本地草稿：画布草稿会写入浏览器 localStorage（key：`builder:visual-builder:v1`），用于防刷新丢失。

4. 导出（Online / 图形化输入，`/visual-builder`）
   - 交互：点击“导出”，前端会拼装导出提示词（包含模块层级、函数/胶水源码块、连线关系、C++ 统一规范），并调用后端生成。
   - 后端 API：`/py/orchestrator/generate`。
   - 归档：导出成功后会写入档案事件 `orchestrator.generate`（`source=visual-builder`），payload 里包含 `prompt` 与 `code`。
   - 持久化策略：为避免浏览器存储上限导致代码丢失，草稿仅保存 `lastExportEventId`，页面重新进入时会从档案回填导出代码。

5. 检测（Online / 测试门禁，`/online/testing`）
   - 输入：从档案选择刚刚导出的 `orchestrator.generate`（source 为 visual-builder）作为门禁输入源。
   - 后端执行：同流程 1 的门禁阶段，会把生成结果落盘到 `gate-workspaces/` 并运行 compile/static/unit/coverage。
   - 归档：写入 `gate.run`。

6. 归档（贯穿全流程）
   - 导出归档：`orchestrator.generate`（prompt + code + 画布 graph 等）。
   - 检测归档：`gate.run`（证据链与结论）。
   - 统一落盘：`archive.jsonl`。

### 5.4 阶段输入约束（重要）

为保证证据链可追溯、避免选错输入导致不可复现，页面做了阶段约束：

流程 1 约束：

- 消歧：产出并入档 `cot.disambiguation`
- 编排：输入源为 `cot.disambiguation`
- 门禁：输入源为 `orchestrator.generate`
- 发布：输入源为“门禁四项通过”的 `gate.run`

流程 2 约束：

- 导出：产出并入档 `orchestrator.generate`（`source=visual-builder`）
- 检测：输入源为 `orchestrator.generate`

## 6. 运维与排错（落盘证据）

- **档案回放**：查看 `archive.jsonl` 事件流，结合页面“档案管理”可快速定位输入与输出。
- **RAG 数据**：查看 `rag.sqlite3`（functions/modules 表）验证函数是否入库、embedding 是否存在。
- **门禁失败**：打开对应 `gate-workspaces/*` 工作区查看编译/单测日志；门禁聚合日志也会写入 `gate.run` 事件。
