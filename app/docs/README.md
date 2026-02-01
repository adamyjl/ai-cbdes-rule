# 文档总览（AI-CBDES-Rule）

本仓库实现了一个“面向智能驾驶基础软件”的代码生产线原型：把既有代码库通过 RAG 管理成可检索的函数资产，再把用户需求结构化为任务卡，经过路由消歧与提示词拼装，最后进入函数编排与代码生成，并把全过程写入档案以便回放与追溯。

## 平台思路

平台按“离线能力演进 / 在线代码生产线”拆分：

- **离线（Offline）**：对本机代码库做扫描、按函数切片、补全中文说明/模块分类、embedding 入库，形成可检索资产；同时把关键动作写入档案（事件流）。
- **在线（Online）**：从图形化搭建/任务输入开始，把需求变成可执行的约束与子任务；对风险/歧义/缺失项进行问答消歧；最后把“消歧后的目标 + 约束 + 关联源码附录”拼成最终提示词，交给编排/生成；测试门禁把执行过程作为 Job 管理并输出证据链。

## 一分钟跑通（本地）

1. 启动：按根目录 [README.md](../README.md) 启动前端（5173）+ FastAPI（8000）（可选 Express 3001）。
2. RAG 管理：进入“离线 / RAG 管理”，首次启动默认会尝试索引 `./data/THICV-Pilot_master`（可用环境变量关闭/修改）。
3. 任务输入：进入“在线 / 任务输入”，填写目标、输入输出约束、验收条件等，提交后端分析。
4. 路由消歧：进入“在线 / 路由消歧”，对风险点/缺失信息逐条问答，收敛出更精确的目标与约束。
5. 函数编排与生成：进入“在线 / 函数编排与生成”，从档案选择 `task.analyze` 或 `cot.disambiguation` 等事件，生成最终提示词并触发代码生成，结果会再次入档。

## 系统架构（可运行实现）

```mermaid
graph TD
  U[Browser] --> FE[React/Vite Frontend]
  FE -->|/py/*| PY[FastAPI :8000]
  FE -->|/api/*| API[Express :3001 (health stub)]

  U -->|80/443| C[Caddy (reverse proxy)]
  C -->|/ (dist)| FE
  C -->|/py/*| PY
  C -->|/api/*| API

  PY --> RAG[(SQLite: rag.sqlite3)]
  PY --> ARC[(JSONL: archive.jsonl)]
  PY --> LLM[DashScope compatible-mode (OpenAI SDK)]
```

说明：

- 前端开发态通过 `vite.config.cjs` 代理把 `/py/*` 转发到 FastAPI，把 `/api/*` 转发到 Express。
- 部署态通过 Caddy 统一对外提供站点与 API（支持域名 HTTPS）。
- RAG 扫描/索引依赖本机文件系统读取代码库，因此当前以本地运行模式为主。

## 核心概念（实现侧）

- **Function Asset（函数资产）**：代码扫描后以“函数”为粒度切片，保存 `file_path/signature/code/doc_zh/module/...` 等元信息，并带 embedding 用于相似度检索。
- **RAG Store（本地索引库）**：SQLite（默认在 `LOCALAPPDATA/ai-cbdes-rule/data/rag.sqlite3`），由后端维护。
- **Archive（档案事件流）**：JSONL 追加写事件，记录“做了什么、输入是什么、输出是什么”，用于回放与追溯。
- **Task Draft（任务卡）**：前端把需求结构化为字段，后端可生成分析 Markdown + 推荐检索 query。
- **Disambiguation（路由消歧）**：后端根据风险/缺失项生成澄清问题，并根据回答更新目标/约束/子任务。
- **Final Prompt（最终提示词）**：将目标/约束/子任务与“关联函数源码附录”合并成可直接用于代码生成的提示词。

## 功能与代码导航

### 前端（React）

- 路由汇总：[src/App.tsx](../src/App.tsx)
- 离线页面：`src/pages/offline/*`
  - RAG 管理：`RagManagementPage`
  - 档案管理：`ArchiveManagementPage`
  - SFT 演进（当前偏 UI 占位）：`SftEvolutionPage`
- 在线页面：`src/pages/online/*`
  - 图形化搭建：`GraphBuilderPage`
  - 任务输入：`TaskInputPage`
  - 路由消歧：`CotRoutingPage`
  - 函数编排与生成：`FunctionOrchestrationPage`
  - 测试门禁：`TestGatePage`
  - 发布：`ReleasePage`
- 前端 API 调用封装：[src/utils/api.ts](../src/utils/api.ts)

### 后端（FastAPI）

- 入口与路由挂载：[backend/app/main.py](../backend/app/main.py)
- Schema 定义（前后端契约）：[backend/app/schemas.py](../backend/app/schemas.py)
- 关键路由（按功能）：
  - RAG：`/rag/*`（扫描/索引/检索/编辑/测试/异步 job）[backend/app/routers/rag.py](../backend/app/routers/rag.py)
  - 档案：`/archive/*`（追加/列表）[backend/app/routers/archive.py](../backend/app/routers/archive.py)
  - 任务分析：`/task/analyze` [backend/app/routers/task.py](../backend/app/routers/task.py)
  - 消歧与提示词拼装：`/cot/*` [backend/app/routers/cot.py](../backend/app/routers/cot.py)
  - 编排/代码生成：`/orchestrator/*` [backend/app/routers/orchestrator.py](../backend/app/routers/orchestrator.py)
  - 测试门禁：`/gate/*` [backend/app/routers/gate.py](../backend/app/routers/gate.py)

## 数据与配置

- 默认数据目录：`LOCALAPPDATA/ai-cbdes-rule/data`（可用 `AI_CBDES_DATA_DIR` 覆盖）
  - RAG：`rag.sqlite3`
  - Archive：`archive.jsonl`
- FastAPI 使用 OpenAI Python SDK 调用百炼兼容网关：确保 `.env` 中配置 `ALIYUN_API_KEY`。

## 在线流水线约束（阶段输入）

- 路由消歧：产出并入档 `cot.disambiguation`
- 函数编排与生成：输入源为 `cot.disambiguation`
- 测试门禁：输入源为 `orchestrator.generate`
- 发布：输入源为“门禁四项通过”的 `gate.run`

## 更详细的产品/技术文档

仓库内已包含更细粒度的 PRD / 技术架构 / 页面设计（作为实现前的设计稿与约束来源）：

- 文档目录：`.trae/documents/`
- 总体技术架构（实现对齐）：[architecture.md](../.trae/documents/architecture.md)
