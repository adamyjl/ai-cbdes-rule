# Rule 平台（主站 /offline/* + /online/*）说明

Rule 平台是本仓库的主站应用（目录 `app/`）：提供 RAG 管理、档案管理与在线代码生产线（任务输入→消歧→编排生成→门禁→发布）。

本文档以**当前可运行实现**为准，覆盖：前台需求与交互、后台接口与数据、用户业务流程与部署方式。

---

## 1. 访问入口与信息架构

- 首页：`/`（Landing：介绍并跳转 Rule / MLLM / GAASD）
- 离线（Offline）
  - `/offline/rag`：RAG 管理
  - `/offline/archive`：档案管理
  - `/offline/sft`：SFT 演进（当前为占位/演示）
- 在线（Online）
  - `/online/task`：任务输入（结构化需求）
  - `/online/routing`：路由消歧（问答）
  - `/online/orchestration`：函数编排与生成
  - `/online/testing`：测试门禁
  - `/online/release`：发布
- 其它
  - `/mllm`：MLLM 控制台（见 [MLLM_WEB.md](MLLM_WEB.md)）
  - `/gaasd`：跳转到子应用 `/gaasd/`

前端路由汇总：`app/src/App.tsx`。

---

## 2. 前台（Frontend）需求与交互

### 2.1 离线：RAG 管理

目标：把本机代码库整理成“函数资产库”。

用户动作与预期：

- 上传/指定 rootDir：确定要扫描的代码根目录
- 扫描：看到文件数/函数数/预览
- 索引：将函数切分结果入库（含 embedding）
- 检索：输入 query 返回相似函数列表
- 查看详情：看到函数签名、源码、中文说明、模块归属、输入输出 JSON
- 修订：允许保存函数源码并（可选）触发再 enrich

### 2.2 离线：档案管理

目标：把关键动作写成事件流，支持回放与追溯。

- 列表：按时间查看近期事件
- 详情：查看事件 payload（任务分析、消歧结果、生成结果、门禁证据等）

### 2.3 在线：任务输入 → 消歧 → 编排生成

目标：把用户需求从“自然语言”收敛为“可生成、可验证”的结构化输入。

- 任务输入（TaskInput）
  - 填写目标模块、意图、功能描述、输入输出规格、生成问题
  - 可选：勾选/引用相关函数或 workflow
  - 输出：分析 Markdown、推荐检索 query、候选函数命中（用于后续消歧/编排）

- 路由消歧（CotRouting）
  - 对风险项/歧义项/缺失项逐条问答
  - 输出：收敛后的 goal/constraints/subtasks，形成可用于生成的 disambiguation

- 函数编排与生成（FunctionOrchestration）
  - 选择档案事件作为输入源（例如 task.analyze 或 cot.disambiguation）
  - 拼装最终提示词（含相关函数源码附录）
  - 调用编排生成接口，得到生成代码与关键要点

### 2.4 在线：门禁与发布

- 测试门禁（TestGate）
  - 启动门禁 job（compile/static/unit/coverage）
  - 轮询展示每一步状态与日志
  - 产出：证据链入档

- 发布（Release）
  - 选择门禁通过的结果
  - 将结果写入 release 存储，并可回灌到 RAG/模块索引

---

## 3. 后台（Backend）接口与数据

### 3.1 接口前缀

- `/py/*`：FastAPI（核心能力）
- `/api/*`：Express（当前主要为健康检查占位）

### 3.2 数据落盘（默认）

后端数据目录由 `AI_CBDES_DATA_DIR` 指定；未设置时使用系统默认目录。

- `rag.sqlite3`：函数资产索引库
- `archive.jsonl`：档案事件流（JSONL 追加写）
- `gate-workspaces/`：门禁运行工作区与证据
- `uploads/`：前端上传代码时的临时目录

### 3.3 核心服务模块（实现侧）

- RAG：`backend/app/services/rag_service.py`（扫描、切分、embedding、检索、编辑、模块发布）
- 任务分析：`backend/app/services/task_analysis_service.py`
- 消歧：`backend/app/services/cot_service.py`
- 编排/生成：`backend/app/services/orchestrator_service.py`
- 门禁：`backend/app/services/gate_service.py` + `gate_jobs.py` + `gate_workspace.py`
- 发布：`backend/app/services/release_service.py`
- 档案：`backend/app/services/archive_service.py`

更完整接口清单见 [API_REFERENCE.md](API_REFERENCE.md)。

---

## 4. 用户业务流程（推荐跑通路径）

1) 离线：RAG 管理 → 扫描/索引目标代码库
2) 在线：任务输入 → 获取分析与候选函数
3) 在线：路由消歧 → 问答收敛目标/约束/子任务
4) 在线：函数编排与生成 → 生成代码并入档
5) 在线：门禁 → 获取四步证据链
6) 在线：发布 → 将“门禁通过”的结果写入 release，并可回灌 RAG

---

## 5. 部署与运维（Windows Server 方案）

部署态采用 Caddy 统一对外提供站点与 API：

- `/` → `app/dist`（主站 SPA）
- `/gaasd/` → `autostudio-ide/dist`（GAASD SPA）
- `/py/*` → FastAPI
- `/api/*` → Express

部署脚本：`app/.deploy/windows-server/deploy.ps1`。

