# 部署与运维（本仓库可运行实现）

本文档聚焦“当前仓库可运行实现”的部署与日常运维：如何在同域提供 Rule/MLLM/GAASD 三套页面与后端服务，以及常见故障排查。

---

## 1. 组件与端口

### 1.1 组件

- 静态站点 A（Rule 主站）：`app/dist`
- 静态站点 B（GAASD 子应用）：`autostudio-ide/dist`
- 后端：FastAPI（`app/backend/app/main.py`）
- 轻量 API：Express（`app/api/index.ts`，当前仅 `/api/health`）
- 网关：Caddy（统一提供 80/443、静态站点与反向代理）

### 1.2 对外路径

- `/` → Rule 主站（SPA）
- `/mllm` → Rule 主站内的 MLLM 路由（SPA 内部路由）
- `/gaasd/` → GAASD 子应用（独立 SPA）
- `/py/*` → FastAPI
- `/api/*` → Express

---

## 2. 本地运行（开发态）

### 2.1 Rule 主站（app）

- 前端开发：Vite dev server
- 后端开发：FastAPI（uvicorn）
- （可选）Express：用于 `/api/health`

建议保持前缀一致：前端始终用 `/py/*`、`/api/*` 访问后端；开发态由 Vite 代理到本机端口。

### 2.2 GAASD（autostudio-ide）

- 开发态：Vite dev server
- 注意：Vite `base` 固定为 `/gaasd/`，用于子路径部署一致性

---

## 3. 生产部署（Windows Server 方案）

### 3.1 一键部署脚本

推荐使用：`app/.deploy/windows-server/deploy.ps1`

脚本会：

- 安装 Python 依赖（venv）
- 构建 Rule 主站：生成 `app/dist`
- 构建 GAASD：生成 `autostudio-ide/dist`
- 写入并使用 Caddyfile
- 通过 NSSM 注册/重启服务：FastAPI / Express / Caddy

### 3.2 关键环境变量

- `AI_CBDES_DATA_DIR`：数据目录（archive/rag/gate-workspaces 等）
- 大模型 Key（按你实际使用）：`ALIYUN_API_KEY` 或 `DASHSCOPE_API_KEY` 或 `AI_CBDES_ALIYUN_API_KEY`

生产建议：使用“机器级环境变量”注入 Key，不要把密钥写入仓库 `.env`。

---

## 4. 静态资源缓存策略（/gaasd 白屏类问题）

GAASD 为 Vite 构建的 hash 资源（`/gaasd/assets/index-xxxx.js`）。若 `index.html` 被缓存而资源 hash 已更新，会导致浏览器白屏。

为避免该问题，Caddy 对 SPA 的“入口 HTML”设置不缓存，并对 Vite 的 hash 资源设置长期缓存（immutable）：

- `index.html`：`Cache-Control: no-store`
- `/gaasd/assets/*`：`Cache-Control: public, max-age=31536000, immutable`

同时建议对 Rule 主站（`/`，包含 `/mllm`、`/vlm` 等 SPA 路由）也采用同样策略：

- 非 `/assets/*`：`Cache-Control: no-store`
- `/assets/*`：`Cache-Control: public, max-age=31536000, immutable`

对应配置见：`app/.runtime/Caddyfile` 与部署脚本中的 `Write-Caddyfile`。

---

## 5. 线上验收清单

- Rule 主站：`https://www.ai-cbdes-rule.com/` 可打开
- GAASD：`https://www.ai-cbdes-rule.com/gaasd/` 可打开且不白屏
- FastAPI：`https://www.ai-cbdes-rule.com/py/health` 返回 `{ ok: true }`
- Express：`https://www.ai-cbdes-rule.com/api/health` 返回 `{ ok: true }`

---

## 6. 常见故障排查

### 6.1 /gaasd 返回 200 但白屏

- 先确认 `index.html` 的 `Cache-Control` 是否为 `no-store`
- 打开 DevTools → Console：
  - 若出现 `Cannot access 'X' before initialization`，通常是打包后出现 TDZ 问题（检查模块顶层引用与声明顺序）
  - 若出现 `Failed to load resource`，通常是 `index.html` 缓存导致引用旧 hash 资源

### 6.2 Caddy 启动失败：端口被占用

- `:80` 被占用：说明已有服务监听 80（可能是旧 caddy 实例或 IIS）。需要停掉旧实例或改用统一服务方式。
- `127.0.0.1:2019` 管理端口被占用：说明已有 caddy 在运行。
  - 正确做法是对现有 caddy 执行 `reload` 更新配置，而不是再启动一个新的。

### 6.3 /py/* 404 或跨域

- 部署态：检查 Caddyfile 是否使用 `handle_path /py/*` 并正确反代到 FastAPI 端口
- 开发态：检查 Vite 代理配置（`app/vite.config.*`）
