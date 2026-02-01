# AI-CBDES-Rule Page Design

## 1. Global Layout
- **Sidebar:** Navigation menu.
  - **Group 1: Offline Capability**
    - RAG Management
    - Archive Management
    - LLM Management
  - **Group 2: Online Production**
    - Graph Builder
    - Task Input
    - CoT Routing
    - Function Orchestration
    - Test Gate
    - Release
- **Main Content Area:** Dynamic content based on route.

## 2. Page Details

### 2.1 RAG Management
- **目录与索引区:** Root Dir 输入、扫描、后台索引任务进度条、补全缺失描述任务进度条。
- **检索区:** 输入 query + TopK，返回命中列表。
- **函数库区:** 模块/关键字筛选浏览函数列表。
- **函数详情抽屉:** 查看源码、显示 `doc_zh/doc_en`、生成描述、编辑保存、测试。

### 2.2 Archive Management
- **列表视图:** 展示 `archive.jsonl` 事件流（type + ts + payload 预览）。
- **详情:** 点击条目查看完整 payload（JSON）。

### 2.3 SFT Evolution
### 2.3 大模型管理
- 当前为占位页（后续接入：模型列表、API Key/网关配置、限流策略参数、使用统计与调用日志）。

### 2.4 Graph Builder
- **左侧:** 按模块加载函数库（可搜索），支持拖拽。
- **中间:** 工作流画布（拖拽节点、点击连线）。
- **右侧:** 节点属性（Inputs/Outputs/Params）与测试命令执行。
- **保存:** 保存到 localStorage；可选写入档案（Archive 事件）。

### 2.5 Task Input
- **左侧:** 函数库 / 模块库（本地工作流 + 档案工作流），可将函数加入任务。
- **中间:** 结构化工单（目标模块、意图、功能描述、输入、输出、代码生成问题、已链接函数/模块）。
- **右侧:** “问题分析”按钮调用 LLM 输出分析（Markdown）并返回 RAG 关联函数列表，支持一键加入。

### 2.6 CoT Routing
- 当前为占位页（后续接入 CoT 路由与消歧流程）。

### 2.6 Function Orchestration
- 当前为占位实现：输入需求 -> 调用后端 plan/generate -> 展示 plan markdown 与 patch diff。

### 2.7 Detection & Test Gate
- 当前为占位页（后续接入编译/静态检查/单测/覆盖率等门禁）。

### 2.8 Task End & Release
- 当前为占位页（后续接入版本信息、变更摘要与发布流程）。
