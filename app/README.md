# AI-CBDES-Rule

智能驾驶基础软件智能编码平台（AI Core Code Agent）。目标是把“需求 → 消歧 → 复用既有代码 → 生成新代码 → 测试门禁 → 交付归档”做成可追溯的闭环生产线。

该仓库是“可运行原型”，包含：
- 前端控制台
  - 离线（Offline）：RAG 管理 / 档案管理 / SFT 演进（占位）
  - 在线（Online）：图形化搭建 / 任务输入 / 路由消歧 / 函数编排与生成 / 测试门禁 / 发布
- FastAPI 主后端
  - RAG 扫描/索引/检索
  - 档案事件流（追加/列表，用于回放与追溯）
  - 任务分析、消歧与提示词拼装、编排代码生成
  - 测试门禁（compile/static/unit/coverage 四步流水线 Job）
- Express 辅助 API（目前仅 `/api/health` 健康检查，占位方便后续扩展）
- Caddy 反向代理（部署态）
  - 统一对外提供站点（静态 `dist`）
  - 反代 `/py/*` → FastAPI，`/api/*` → Express
  - 生产域名默认启用 HTTPS（Let's Encrypt）

更多说明：
- 项目说明与整体流程：[docs/README.md](docs/README.md)
- 开发者扩展指南：[docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)
- PRD/技术架构/页面设计（更详细）：[.trae/documents](.trae/documents)

## 启动前端 + Express API

```bash
npm install
```

终端 A（启动 Express）：

```bash
npm run api:dev
```

终端 B（启动前端）：

```bash
npm run dev
```

打开 `http://localhost:5173`，右上角 `API: ok` 表示已连通 `/api/health`。

> 前端访问 FastAPI 通过 Vite 代理 `/py/*`，见「前端代理说明」。

## 一键本地部署（Windows / PowerShell）

在项目根目录执行：

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\start_local.ps1
```

如果启动失败：查看 `.logs/fastapi.err.log`、`.logs/express.err.log`、`.logs/vite.err.log` 获取具体错误原因。

启动后：
- 前端：`http://127.0.0.1:5173/`
- FastAPI：`http://127.0.0.1:8000/health`
- Express：`http://127.0.0.1:3001/api/health`

停止（best-effort）：

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\stop_local.ps1
```

## 启动 FastAPI（主后端）

在 Windows 上，如果你的项目目录位于 `Documents` 等受保护目录，可能会遇到 `python -m venv .venv` 报错：
`[WinError 2] 系统找不到指定的文件`。

这是因为 Python 进程被系统/安全策略限制在该目录创建文件（表现为“找不到文件”）。建议把虚拟环境创建到 `LOCALAPPDATA`。

另外，当前环境如使用 Python `3.14`，`pydantic-core` 可能没有预编译 wheel，会触发 Rust 编译导致安装失败；建议使用 Python `3.13`。

推荐命令（PowerShell，项目根目录执行）：

```bash
py -0p
$env:AI_CBDES_VENV = Join-Path $env:LOCALAPPDATA 'venvs\\ai-cbdes-rule-py313'
py -3.13 -m venv $env:AI_CBDES_VENV
& "$env:AI_CBDES_VENV\\Scripts\\python.exe" -m pip install -r backend\\requirements.txt
& "$env:AI_CBDES_VENV\\Scripts\\uvicorn.exe" backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

FastAPI 的 RAG 索引/检索会通过阿里云百炼的 OpenAI 兼容接口调用模型：请确保已设置 `.env` 中的 `ALIYUN_API_KEY`。

默认会尝试自动索引 `./data/THICV-Pilot_master`（首次启动且库为空时）。如需关闭：设置 `AI_CBDES_AUTO_INDEX=0`。
如需改默认目录：设置 `AI_CBDES_DEFAULT_RAG_ROOT`。

可选配置：
- `AI_CBDES_DATA_DIR`：RAG/档案持久化目录（默认 `LOCALAPPDATA/ai-cbdes-rule/data`）
- `AI_CBDES_ALIYUN_BASE_URL`：百炼 OpenAI 兼容网关（默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`）
- `AI_CBDES_ALIYUN_EMBED_MODEL`：Embedding 模型（默认 `text-embedding-v4`）
- `AI_CBDES_ALIYUN_CHAT_MODEL`：函数中文说明/模块分类模型（默认 `glm-4.7`）

健康检查：`http://localhost:8000/health`

## 生产部署（Windows Server / 公网）

推荐使用仓库内置脚本一键部署（会安装依赖、构建前端、并注册 Windows 服务）：

```powershell
cd C:\srv\ai-cbdes-rule\app
powershell -ExecutionPolicy Bypass -File .\.deploy\windows-server\deploy.ps1 `
  -DataDir C:\srv\ai-cbdes-rule\data `
  -PublicHost www.ai-cbdes-rule.com
```

部署结果：
- Windows 服务：`ai-cbdes-fastapi` / `ai-cbdes-express` / `ai-cbdes-caddy`
- Caddy 配置：`app\.runtime\Caddyfile`
- 前端产物：`app\dist\`

域名与 HTTPS：
- 推荐访问：`https://www.ai-cbdes-rule.com`
- 仅使用 IP 访问（`http://47.110.142.63`）属于明文 HTTP，浏览器会提示“连接不安全”，这是预期现象；生产应统一用域名 HTTPS。
- 安全组需放行 `80` 与 `443`（80 用于 HTTP→HTTPS 跳转及证书签发/续期）。

常用健康检查：
- `https://www.ai-cbdes-rule.com/py/health` → FastAPI
- `https://www.ai-cbdes-rule.com/api/health` → Express

## 前端代理说明

- `/api/*` → `http://localhost:3001`（Express）
- `/py/*` → `http://localhost:8000`（FastAPI）

例如：`/py/rag/query` 会被代理到 `http://localhost:8000/rag/query`。

## 关键入口速查

- 前端路由：[src/App.tsx](src/App.tsx)
- FastAPI 入口与路由挂载：[backend/app/main.py](backend/app/main.py)
- FastAPI Schema（请求/响应结构）：[backend/app/schemas.py](backend/app/schemas.py)
- API 客户端（前端调用 `/py/*`、`/api/*`）：[src/utils/api.ts](src/utils/api.ts)

## 目录结构速查

- `src/`：前端（React + Vite + Ant Design + Zustand）
  - `src/pages/offline/*`：离线页面（RAG/档案/SFT）
  - `src/pages/online/*`：在线页面（搭建/任务/消歧/编排/门禁/发布）
- `backend/`：FastAPI 后端（RAG/档案/任务分析/消歧/编排/门禁/发布）
- `scripts/`：本地一键启动与自测脚本
- `.deploy/windows-server/`：Windows Server 部署脚本与数据迁移清单
- `.runtime/`：部署态运行文件（Caddyfile、启动脚本、运行时二进制）

## 使用提示（在线流水线约束）

为保证证据链可追溯、避免选错档案导致结果不可复现，在线页面对“可选档案事件”做了阶段约束：
- 路由消歧：产出并入档 `cot.disambiguation`
- 函数编排与生成：只允许选择 `cot.disambiguation` 作为输入源
- 测试门禁：只允许选择 `orchestrator.generate` 作为输入源
- 发布：只允许选择“门禁四项通过”的 `gate.run` 作为发布源

档案会在浏览器侧做一次性缓存（localStorage + Zustand），避免每页反复拉取；页面点击“刷新档案”时才会拉远端合并更新。
