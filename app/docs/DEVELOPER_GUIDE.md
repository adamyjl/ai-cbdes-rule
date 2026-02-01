# 开发者指南（如何扩展 AI-CBDES-Rule）

本文档面向二次开发：当你要新增一个能力模块（一个页面 + 一组 API + 可追溯的档案事件）时，按当前仓库的既有惯例如何落地。

## 后端：新增 FastAPI 能力模块

推荐最小闭环：`schemas`（契约）→ `services`（业务）→ `routers`（API）→ `main.py` 挂载。

1. 定义请求/响应结构
   - 在 [backend/app/schemas.py](../backend/app/schemas.py) 增加对应的 Pydantic Model。
2. 实现业务逻辑
   - 在 `backend/app/services/` 新增 `xxx_service.py`，只做纯业务，不直接依赖 FastAPI。
   - 需要调用模型时统一走 `openai_client.py + llm_policy.py`（限流/重试在这里集中处理）。
3. 增加路由
   - 在 `backend/app/routers/` 新增 `xxx.py`，把 service 组合成 `@router` 的 handler。
4. 挂载路由
   - 在 [backend/app/main.py](../backend/app/main.py) 中 `include_router(router)`。
5. 需要可追溯时写档案
   - 后端档案是 JSONL 追加写：实现见 [backend/app/services/archive_service.py](../backend/app/services/archive_service.py)。
   - 事件类型建议采用 `模块.动作`（例如 `rag.query`、`task.analyze`、`cot.disambiguation`、`orchestrator.generate`）。

## 前端：新增页面与路由

1. 新增页面组件
   - 离线页面放在 `src/pages/offline/`，在线页面放在 `src/pages/online/`。
2. 注册路由
   - 在 [src/App.tsx](../src/App.tsx) 增加 `<Route />`。
3. 增加菜单入口（如需要）
   - 菜单外壳在 `src/components/layout/`，按现有导航结构补入口。

## 前端：新增 API 调用

前端对后端的访问统一收敛在 [src/utils/api.ts](../src/utils/api.ts)。

- FastAPI 走 `/py/*`（开发态由 Vite 代理转发到 `:8000`）
- Express 走 `/api/*`（开发态由 Vite 代理转发到 `:3001`）

新增接口时，建议：

- 在 `api.ts` 增加一个函数封装请求与错误处理
- 页面中只调用封装函数，不直接拼接 URL
- 返回结构尽量与后端 `schemas.py` 对齐（`ok/error` 这种统一字段可以保持一致）

## RAG：扩展扫描/切分/索引

当前 RAG 的实现思路是：

- 读取目录 → 扫描代码文件 → 按函数切片 → LLM 增强（中文说明/模块分类/显示名）→ embedding → SQLite 持久化 → 本地相似度检索。

常见扩展点：

- 新语言/新文件类型：在 `code_scanner.py` 与对应 splitter 中扩展规则
- 新的元信息字段：同步更新 SQLite 表结构（如果需要）与前后端展示
- 检索策略：在 `rag_store.py` 的向量相似度计算与 TopK 组合处调整

## 消歧与最终提示词拼装

消歧由 [backend/app/services/cot_service.py](../backend/app/services/cot_service.py) 提供三个关键能力：

- `make_question`：针对单条风险/缺失项生成“一句最关键的问题”
- `refine_with_answer`：根据回答更新目标/约束/子任务与列表
- `build_final_prompt`：把目标/约束/子任务与关联函数源码拼成最终提示词

要引入新的“消歧维度”（例如性能、坐标系、线程模型），优先在任务分析阶段产出列表项，再复用以上三段流程。

## 编排与代码生成

编排/生成的后端入口在：

- [backend/app/services/orchestrator_service.py](../backend/app/services/orchestrator_service.py)

约束建议：

- 输出结构化 JSON（后端已有兜底解析逻辑）
- 代码输出统一 Markdown（按 `### 相对路径` + 代码块）便于前端渲染与后续 patch
- 不在任何日志/返回值中泄露密钥或环境变量值
