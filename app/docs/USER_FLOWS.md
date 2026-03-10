# 用户业务流程（Rule / MLLM / GAASD）

本文档以**当前工程可运行实现**为准，整理三套页面（Rule / MLLM / GAASD）从“用户视角”的端到端流程，并标注每一步对应的数据沉淀与后端能力边界。

---

## 1. Rule（主站）端到端流程

Rule 负责“代码生产线闭环”：资产准备 → 需求结构化 → 消歧 → 编排生成 → 门禁 → 发布归档。

### 1.1 离线：资产准备（RAG 管理）

目标：把本机/服务器上的既有代码库转换成可检索的函数资产。

流程：

1) 进入 `/offline/rag`
2) 设置或上传代码根目录 `root_dir`
3) 执行扫描（scan）确认文件/函数数量
4) 执行索引（index-job），等待 embedding 入库
5) 检索/筛选命中函数，查看详情并（必要时）修订函数说明或源码

数据沉淀：

- `rag.sqlite3`：函数条目、中文说明、输入输出 JSON、embedding
- `uploads/`：上传的临时目录（可被后续 scan/index 使用）

关键后端能力：

- `/py/rag/scan`、`/py/rag/index-job`、`/py/rag/functions`、`/py/rag/function`

### 1.2 在线：需求结构化（任务输入）

目标：把自然语言需求变成“可分析、可生成、可验证”的字段集合。

流程：

1) 进入 `/online/task`
2) 填写：目标模块、意图、功能描述、输入/输出规格、验收标准、生成问题
3)（可选）选择关联函数/模块/workflow 作为上下文
4) 提交任务分析

产出：

- 分析 Markdown
- 推荐 RAG 查询语句与候选命中（可作为后续消歧/编排输入）

关键后端能力：

- `/py/task/analyze`

### 1.3 在线：路由消歧（问答收敛）

目标：把风险点/歧义/缺失信息通过问答收敛为明确的目标与约束。

流程：

1) 进入 `/online/routing`
2) 按模式（risk/missing/ambiguity）生成问题
3) 输入回答，触发 refine
4) 重复直到“目标/约束/子任务”足够明确

产出：

- `goal`（目标）、`constraints`（约束）、`subtasks`（子任务列表）
- 风险项/缺失项逐步被标记为已解决

关键后端能力：

- `/py/cot/question`、`/py/cot/refine`

### 1.4 在线：编排生成（拼装最终提示词 → 生成）

目标：把“消歧后的目标 + 约束 + 子任务 + 相关函数源码附录”合成最终提示词，并触发生成。

流程：

1) 进入 `/online/orchestration`
2) 选择输入源（通常来自任务分析或消歧结果的档案事件）
3) 拼装最终提示词（包含函数源码附录）
4) 调用生成接口（返回关键要点 + 生成文本/代码）

数据沉淀：

- 档案事件流（`archive.jsonl`）记录输入与生成结果

关键后端能力：

- `/py/cot/generate-prompt`
- `/py/orchestrator/generate` 或 `/py/orchestrator/generate-code`
- `/py/archive/events`

### 1.5 在线：门禁（compile/static/unit/coverage）

目标：对生成结果进行可追溯的四步验证，形成证据链。

流程：

1) 进入 `/online/testing`
2) 选择要验证的生成结果（通常来自档案事件）
3) 填写/确认工作目录与命令（compile/static 等）
4) 启动门禁 job，轮询状态与日志

数据沉淀：

- `gate-workspaces/`：每次运行的独立工作区与日志
- 档案事件记录门禁输入与结果

关键后端能力：

- `/py/gate/start`、`/py/gate/jobs/{job_id}`、`/py/gate/jobs/{job_id}/cancel`

### 1.6 在线：发布

目标：只允许“门禁通过”的结果进入发布，并写入可查询的发布存储。

流程：

1) 进入 `/online/release`
2) 选择门禁通过的结果
3) 写入 release 存储（可选同步回灌到 RAG/模块索引）

关键后端能力：

- `/py/release/rag-index`、`/py/release/modules-upsert`

---

## 2. GAASD（/gaasd/）端到端流程

GAASD 提供“图形化搭建”的另一种入口：更偏“画布 + 代码资产 + 生成/门禁联动”，用于快速验证模块拼装与调用关系。

### 2.1 工程与画布

1) 打开 `/gaasd/`
2) 新建/打开工程（浏览器 `localStorage` 持久化工程元信息）
3) 一个工程内可管理多个画布（tabs）
4) 保存时显式持久化：工程元信息 + 画布图（nodes/edges）

### 2.2 图形化搭建

1) 扫描/索引（通过后端 RAG）
2) 从资产列表拖拽函数/模块到画布
3) 从输出端口拖拽到输入端口完成连线（支持命名端口）
4) 模块节点支持展开/折叠（子图加载与缓存）
5) 自动布局整理结构

### 2.3 生成、门禁、发布

GAASD 复用主后端能力：

- 任务分析/消歧：同 `/py/task/*`、`/py/cot/*`
- 生成：同 `/py/orchestrator/*`
- 门禁：同 `/py/gate/*`
- 发布：同 `/py/release/*`

GAASD 侧更强调把“画布图快照”作为 prompt 的结构化输入来源之一。

---

## 3. MLLM（/mllm）端到端流程

MLLM 页是“多模态大模型工作台/控制台”的前端骨架，当前以信息架构与交互原型为主。

### 3.1 当前实现边界（重要）

- 当前 MLLM 页仅做 UI 原型展示；
- 唯一实时接口调用是 `GET /api/health`（展示 API 状态 Tag）；
- 未与 FastAPI 的 RAG/生成/门禁做深度绑定（后续可按 Rule 的后端能力逐步对接）。

### 3.2 用户业务流程（原型）

1) 打开 `/mllm`
2) 顶栏看到 API 状态（来自 `/api/health`）
3) 在顶部导航切换模块：Project Center / Workflow Builder / Prompt Studio / Model Studio / Evaluation Gate / Deployment Hub / Data Factory
4) 每个模块展示对应的 UI 骨架与示例组件

后续对接建议：

- Prompt Studio：对接 `/py/cot/*` + `/py/orchestrator/*` 做提示词与生成
- Evaluation Gate：对接 `/py/gate/*` 复用门禁证据链
- Data Factory：对接 RAG 的上传/扫描/索引能力（`/py/rag/*`）做数据准备

