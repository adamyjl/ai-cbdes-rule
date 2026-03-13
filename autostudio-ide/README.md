<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2a35b77c-760e-4318-b23b-cfa146f2b327

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## 组件库分类规范（必须遵守）

GAASD 的组件库包含两类：

- **函数组件库**：来自后端 RAG 的 `functions`
- **模块组件库**：来自后端 RAG 的 `modules`（也称 indexed-modules）

为了保证组件分布合理并便于演示与检索，分类比例要求如下（对函数/模块都适用）：

- `glue` 工程胶水：**不小于 10%，不超过 20%**
- `platform` 基础设施：**不小于 10%，不超过 20%**
- 其余全部归为 `node` 关键算法

函数组件库的 `node` 关键算法分类补充约束：

- 在 `node` 关键算法总数中，`控制/决策/定位/感知/规划` 五个分类 **每个分类的数量都必须超过 node 总数的 5%**（不足时需要从 `其他` 或其他富余分类中迁移补齐）

实现位置：分类与比例控制在 `src/components/Layout/Workspace.tsx` 的组件库面板内部完成（启发式评分 → 重平衡到目标区间）。

## 组件库数据范围（是否按 root_dir 过滤）

GAASD 组件库 **默认不按 `root_dir` 过滤**：

- 前端在加载函数/模块列表时，不传 `root_dir` 参数，因此会展示后端数据库中的“全量组件”。
- 后端接口支持可选 `root_dir` 参数；只有显式传入时才会过滤。

快速校验（线上示例）：

- `GET /py/rag/functions?limit=1` 的 `total` 应等于 `GET /py/rag/functions?limit=1&root_dir=...`（当数据库里仅有一个 root_dir 时，两者相等）
- `GET /py/rag/indexed-modules?limit=1` 的 `total` 同理

## 模块索引（module-index-job）说明

`POST /py/rag/module-index-job` 支持参数 `enrich`：

- `enrich=false`（默认）：快速生成模块（保证数量与结构可用），不做 LLM 文档增强与模块 embedding
- `enrich=true`：生成模块后进一步做 LLM 文档增强与 embedding（耗时更长）
