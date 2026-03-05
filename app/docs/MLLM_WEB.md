# MLLM 前端工程（AI-CBDES-MLLM-Web）说明

本文档面向仓库新增的前端工程目录 `AI-CBDES-MLLM-Web/`，整理其整体结构、实现方式，并说明如何与现有主工程（`app/`）集成部署到 `http://127.0.0.1/mllm/`。

## 1. 工程实现目标

`AI-CBDES-MLLM-Web` 目标是提供一个“多模态大模型（MLLM）工作台/控制台”的前端原型界面，用于承载与 MLLM 研发相关的模块入口与交互雏形：

- **Project Center**：项目/实验管理入口与概览
- **Workflow Builder**：工作流编排 UI（原型）
- **Prompt Studio**：提示词编写与版本管理 UI（原型）
- **Model Studio**：模型选择、参数配置与对齐 UI（原型）
- **Evaluation Gate**：评测门禁与指标展示 UI（原型）
- **Deployment Hub**：部署入口与发布状态 UI（原型）
- **Data Factory**：数据准备、标注、清洗入口 UI（原型）

当前工程更多偏“前端信息架构 + 交互骨架”的展示，并未与本仓库的 FastAPI/Express 做深度接口绑定（后续可按本仓库 `/py/*`、`/api/*` 的网关规范逐步对接）。

## 2. 技术框架与依赖

工程类型：**Vite + React + TypeScript** 的单页应用（SPA）。

- 构建与开发：Vite（`vite` / `vite build`）
- UI：React 19
- 图标：`lucide-react`
- 图表：`recharts`
- 样式：通过 `index.html` 引入 `tailwindcss` CDN（不依赖 Tailwind 构建链）

注意：工程内 `vite.config.ts` 定义了 `process.env.GEMINI_API_KEY` 的编译期注入，但在浏览器端直接注入第三方模型 Key 并不安全。若需要在线调用，应改为走本仓库后端统一代转发（由后端持有 Key）。

## 3. 目录结构与代码组织

`AI-CBDES-MLLM-Web/`（节选）：

- `package.json`：脚本与依赖（`dev/build/preview`）
- `vite.config.ts`：Vite 配置（已将 `base` 设置为 `/mllm/` 以支持子路径部署）
- `index.html`：入口 HTML（Tailwind CDN + React 挂载点）
- `index.tsx`：前端入口（创建 React root 并渲染 `App`）
- `App.tsx`：整体布局（左侧导航 + 右侧内容区域），通过 `useState(activeTab)` 做模块切换
- `constants.ts`：导航项定义（label、icon、id）
- `types.ts`：类型与枚举（例如 `NavSection`）
- `components/`：按模块拆分的页面级组件（每个模块一个 TSX）

实现方式概览：

- **导航与路由**：当前不使用 React Router；采用“左侧导航 + 内部状态切换”的方式渲染各模块组件。
- **模块实现**：每个模块在 `components/*.tsx` 内实现独立 UI；`App.tsx` 通过 `switch(activeTab)` 决定渲染组件。
- **样式方案**：Tailwind className 直接写在组件上；Tailwind 由 CDN 注入（无需构建 Tailwind）。

## 4. 与现有工程的集成与部署方案（/mllm）

本仓库已有主工程 `app/`（React Router 单页应用），部署时通过 Caddy 提供：

- 静态站点：`app/dist`
- 反向代理：`/py/*`（FastAPI）、`/api/*`（Express）

为了让 `http://127.0.0.1/mllm` 可用，并复用现有工程的部署链路，本仓库采用“**集成到主前端路由**”的方式：

1. **页面实现**：将 `AI-CBDES-MLLM-Web` 的信息架构与 UI 骨架移植到主工程内，新增路由 `/mllm`（见 `app/src/pages/mllm/MllmConsolePage.tsx`）。
2. **部署复用**：主工程已通过 Caddy 的 `try_files {path} /index.html` 支持 SPA 刷新，因此无需新增 Caddy 路由；部署时正常构建 `app/dist` 即可。

访问入口：

- `http://127.0.0.1/mllm`

说明：仓库中的 `AI-CBDES-MLLM-Web/` 作为“独立工程形态”的参考源保留，用于对照其模块划分与 UI 结构；当前部署路径以主工程 `/mllm` 路由为准。

## 5. 开发方式（本地调试）

在 `AI-CBDES-MLLM-Web/` 目录下：

- 安装依赖：`npm install` 或 `npm ci`
- 开发启动：`npm run dev`（默认 `0.0.0.0:3000`）
- 构建：`npm run build`

如需与本仓库后端联调，建议统一通过主工程的 `/py/*`、`/api/*` 路径访问后端接口，以便开发态（Vite 代理）与部署态（Caddy）保持一致。
