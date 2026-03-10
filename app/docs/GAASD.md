# GAASD 子应用（/gaasd/）说明

GAASD（Graph-Assisted Auto Software Design）是本仓库的“图形化搭建/编排”子应用：通过画布把函数与模块组织成 workflow，再把用户需求与图结构合成提示词，触发后端生成、门禁与发布。

本文档以**当前仓库可运行实现**为准，覆盖：前台需求与交互、后台接口与数据、用户业务流程、部署方式与边界。

---

## 1. 访问与部署

- 部署态入口：`https://www.ai-cbdes-rule.com/gaasd/`
- 本地开发态：`autostudio-ide` 使用 Vite，`base` 固定为 `/gaasd/`（适配子路径部署）
- 部署态静态站点：由 Caddy 将 `/gaasd/*` 指向 `autostudio-ide/dist`，并使用 SPA fallback（`try_files {path} /index.html`）

关联实现：
- 前端：`autostudio-ide/src/*`
- API 封装：`autostudio-ide/src/services/backend.ts`（统一走 `/py/*` 和 `/api/*` 前缀）

---

## 2. 前台（Frontend）需求与交互

### 2.1 核心目标

1) 把“代码资产（函数/模块）”以图的方式组合成可理解、可复用的 workflow。
2) 把“需求 + 图结构 + 相关函数源码附录”合成可执行提示词，驱动生成与门禁。
3) 支持在一个工程内管理多画布、多模块版本与生成证据链（日志/门禁结果）。

### 2.2 主要界面与能力

GAASD 前端以单页应用呈现，主要区域：

- 顶部栏：工程选择/新建/保存、后端健康检查、扫描管理入口
- 左侧（或侧栏区域）：函数/模块资产浏览与检索、拖拽到画布
- 中央画布：节点（函数/模块）、命名端口、多输入多输出连线、自动布局、右键菜单
- 右侧属性面板：选中节点属性、变更摘要、只读代码视图
- 底部日志/流水线：生成日志、门禁四步（compile/static/unit/coverage）状态、终端输出

### 2.3 画布数据模型（对用户可感知的行为）

- 节点：函数或模块
  - 函数节点包含 `functionId/displayName/module/signature/inputsJson/outputsJson`
  - 模块节点包含 `moduleKey/displayName/inputsJson/outputsJson`，可展开为子图
- 连线：从输出端口到输入端口
  - 支持命名端口（按 `inputsJson/outputsJson` 的字段名）
  - 连线记录 `fromPort/toPort`，用于端点锚定与后续提示词拼装

### 2.4 工程与持久化

- 工程元信息（名称、rootDir、prompt）保存在浏览器 `localStorage`
- 画布（多画布、节点、连线、活动画布）按 `projectId` 持久化到 `localStorage`
- “保存”会显式触发一次画布持久化，避免仅依赖自动保存的时序问题

---

## 3. 后台（Backend）接口与实现边界

GAASD 前端不直接持有任何模型密钥；所有能力通过同域 API 前缀访问：

- `/py/*` → FastAPI（核心能力：RAG/任务分析/消歧/编排/门禁/发布/档案）
- `/api/*` → Express（当前主要用于健康检查占位）

### 3.1 GAASD 常用接口清单（按用户动作）

- 资产准备
  - 扫描：`POST /py/rag/scan`
  - 触发索引（同步/异步）：`POST /py/rag/index` 或 `POST /py/rag/index-job`
  - 列表/查询函数：`GET /py/rag/functions`
  - 获取函数详情与源码：`GET /py/rag/function`
  - 列表/获取模块索引：`GET /py/rag/indexed-modules`、`GET /py/rag/module`

- 需求分析与消歧
  - 任务分析：`POST /py/task/analyze`
  - 生成澄清问题：`POST /py/cot/question`
  - 依据回答细化：`POST /py/cot/refine`
  - 拼装最终提示词：`POST /py/cot/generate-prompt`

- 生成与门禁
  - 生成（编排/总结要点）：`POST /py/orchestrator/generate`
  - 门禁启动：`POST /py/gate/start`
  - 轮询门禁状态：`GET /py/gate/jobs/{job_id}`

- 发布与归档
  - 归档事件：`POST /py/archive/events`、`GET /py/archive/events`
  - 发布（示例能力）：`POST /py/release/rag-index`、`POST /py/release/modules-upsert`

说明：更完整的后端接口清单见 [API_REFERENCE.md](API_REFERENCE.md)。

### 3.2 关键边界与约束

- RAG 扫描/索引依赖服务器本机文件系统；`root_dir` 必须是后端可访问路径。
- 生成依赖后端配置的大模型 Key（生产建议通过系统环境变量注入）。
- 门禁需要服务器具备编译/静态/单元/覆盖度所需工具链（Windows Server 场景依赖 VS Build Tools）。

---

## 4. 用户业务流程（推荐路径）

### 4.1 首次使用（资产准备）

1) 选择/新建工程，设置 `rootDir` 指向待扫描代码库
2) 执行“扫描/索引”，等待函数资产入库
3) 在函数列表中检索并拖拽关键函数到画布

### 4.2 图形化搭建（workflow）

1) 在画布中摆放函数/模块节点
2) 通过端口连线表达调用/数据流关系（命名端口按字段对齐）
3) 对模块节点执行“展开/折叠”，并用自动布局整理结构

### 4.3 需求驱动生成与门禁

1) 填写需求/约束（或由任务分析生成结构化字段）
2)（可选）执行消歧问答以收敛目标
3) 触发编排生成，产出目标代码与关键要点
4) 启动门禁四步检测并轮询结果
5) 将关键事件写入档案，形成可追溯证据链

---

## 5. 代码导航（实现侧）

- GAASD 入口：`autostudio-ide/src/App.tsx`
- 画布与布局：`autostudio-ide/src/components/Layout/Workspace.tsx`
- 顶部/工具栏：`autostudio-ide/src/components/Layout/TopBar.tsx`、`Toolbar.tsx`
- API 访问层：`autostudio-ide/src/services/backend.ts`

