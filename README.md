# AI-CBDES-Rule（AI Core Code Agent）

面向“智能驾驶基础软件”的智能编码平台原型：把既有代码资产（函数粒度）通过 RAG 管理成可检索库，再将需求结构化为任务卡，经“消歧 → 编排 → 生成 → 门禁 → 发布 → 归档”形成可追溯闭环。

本仓库包含两部分：
- `app/`：可运行的平台实现（前端 + 后端 + 部署脚本）
- `data/`：运行时数据与样例工作区（档案、门禁工作区等，生产建议外置）

---

## 功能概览（平台页面）

前端控制台按 Offline/Online 两组能力组织：

- 离线（Offline）
  - **RAG 管理**：扫描代码库 → 函数切分 → embedding 入库 → 相似检索 → 函数详情查看
  - **档案管理**：查看/回放流水线关键事件（便于追溯与复现）
  - **SFT 演进**：占位页（为后续数据闭环预留）
- 在线（Online）
  - **图形化搭建**：拖拽函数到画布，组成 workflow（当前偏交互样例）
  - **任务输入**：把需求结构化成字段，触发后端分析（生成分析 Markdown + 推荐检索 query）
  - **路由消歧**：对风险/缺失项问答，收敛目标/约束/子任务，产出可入档事件
  - **函数编排与生成**：拼装最终提示词，触发代码生成并入档
  - **测试门禁**：对生成结果执行四步检测（compile/static/unit/coverage），形成证据链并入档
  - **发布**：仅允许选择“门禁通过”的结果，执行 RAG 入库/模块入库与发布归档

在线链路为保证可追溯与减少选错输入，页面对“可选档案事件”做了阶段约束：
- 消歧：产出并入档 `cot.disambiguation`
- 编排：输入源为 `cot.disambiguation`
- 门禁：输入源为 `orchestrator.generate`
- 发布：输入源为“门禁四项通过”的 `gate.run`

---

## 技术方案（实现视角）

### 组件

- 前端：React + Vite + Ant Design + Zustand
- 后端：FastAPI（主后端）
- 辅助 API：Express（当前仅 `/api/health`，用于占位扩展）
- 部署入口：Caddy（反向代理 + 静态站点 + 域名 HTTPS）

### 数据与持久化

后端默认把数据写入 `AI_CBDES_DATA_DIR` 指定的数据目录（未设置则使用系统默认目录）。主要文件：

- `archive.jsonl`：档案事件流（JSONL 追加写），记录“做了什么/输入是什么/输出是什么”
- `rag.sqlite3`：RAG 索引库（SQLite）
- `gate-workspaces/`：门禁运行时工作区（每次检测会生成一个独立 workspace）

仓库根目录的 `data/` 目录用于放置样例数据与本地运行时产物（演示/自测用）。生产部署建议把数据目录外置到独立磁盘路径，并通过环境变量 `AI_CBDES_DATA_DIR` 指向。

### 访问路径

- 部署态（Caddy 对外提供）
  - `/`：前端静态站点（`app/dist`）
  - `/py/*`：反代 FastAPI
  - `/api/*`：反代 Express
- 开发态（Vite 代理）
  - `/py/*` → `http://127.0.0.1:8000`
  - `/api/*` → `http://127.0.0.1:3001`

---

## 目录结构

```text
.
├─ app/                       平台实现（前端/后端/部署脚本）
│  ├─ src/                    前端源码
│  ├─ backend/                FastAPI 后端源码
│  ├─ .deploy/windows-server/ Windows Server 一键部署脚本
│  ├─ .runtime/               部署态运行文件（Caddyfile、二进制、启动脚本）
│  ├─ scripts/                本地一键启动与自测脚本
│  └─ dist/                   前端构建产物（部署态使用）
└─ data/                      运行时数据与样例工作区（生产建议外置）
   ├─ archive.jsonl           档案事件流
   └─ gate-workspaces/        门禁工作区（示例/自测）
```

更细粒度的实现说明：
- 平台实现与本地启动：[app/README.md](app/README.md)
- 文档总览与架构图：[app/docs/README.md](app/docs/README.md)

---

## 本地运行（开发态）

进入 `app/`：

```bash
cd app
npm install
```

终端 A：

```bash
npm run api:dev
```

终端 B：

```bash
npm run dev
```

打开 `http://localhost:5173`。

或使用一键脚本（Windows / PowerShell）：

```powershell
cd app
powershell -ExecutionPolicy Bypass -File .\scripts\start_local.ps1
```

---

## 部署要求（Windows Server / 公网）

### 必备

- Windows Server（建议 2019+）
- Node.js（用于前端构建与 Express）
- Python 3.13（非 Store 版，避免路径与权限问题）
- Git

### 推荐

- Visual Studio Build Tools（C++ workload）：用于门禁 compile/unit/coverage
- 域名已备案并解析到公网 IP
- 安全组放行：`80` 与 `443`

访问注意：
- 生产环境请使用 **域名 HTTPS**（如 `https://www.ai-cbdes-rule.com`）
- 仅使用 **IP + HTTP**（如 `http://47.110.142.63`）会被浏览器提示“连接不安全”，这是 HTTP 明文的正常提示
- 不建议访问 `https://<IP>`：证书不会匹配裸 IP

---

## 部署流程（Windows Server 一键部署）

在服务器上执行：

```powershell
cd C:\srv\ai-cbdes-rule\app
powershell -ExecutionPolicy Bypass -File .\.deploy\windows-server\deploy.ps1 `
  -DataDir C:\srv\ai-cbdes-rule\data `
  -PublicHost www.ai-cbdes-rule.com
```

部署会：
- 安装 Python 依赖、构建前端
- 写入 `app\.runtime\Caddyfile`
- 注册并启动 Windows 服务：
  - `ai-cbdes-fastapi`
  - `ai-cbdes-express`
  - `ai-cbdes-caddy`

健康检查：
- `https://www.ai-cbdes-rule.com/py/health`
- `https://www.ai-cbdes-rule.com/api/health`

数据迁移清单：见 [app/.deploy/windows-server/MIGRATE_DATA.md](app/.deploy/windows-server/MIGRATE_DATA.md)

---

## 展示截图（示例）

> 下列图片为风格化示例图，用于 README 展示；实际界面以运行后的页面为准。

![平台首页示意](https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=dark%20theme%20web%20dashboard%2C%20AI%20coding%20platform%2C%20sidebar%20navigation%20with%20Offline%20and%20Online%20sections%2C%20Chinese%20labels%2C%20cards%20showing%20RAG%20management%2C%20Archive%2C%20Task%20Input%2C%20Gate%20Test%2C%20modern%20UI%2C%20high%20fidelity%20product%20screenshot%20style%2C%20no%20logos&image_size=landscape_16_9)

![函数编排与生成示意](https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=dark%20theme%20web%20app%20page%2C%20function%20orchestration%20and%20code%20generation%20panel%2C%20left%20side%20event%20selector%2C%20right%20side%20prompt%20preview%20and%20generated%20code%20editor%2C%20Chinese%20UI%20text%2C%20high%20fidelity%20screenshot%2C%20no%20logos&image_size=landscape_16_9)

![测试门禁示意](https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=dark%20theme%20web%20app%20page%2C%20CI%20gate%20test%20pipeline%2C%20steps%20compile%2C%20static%2C%20unit%2C%20coverage%20with%20status%20icons%2C%20log%20console%20panel%2C%20Chinese%20UI%20text%2C%20high%20fidelity%20screenshot%2C%20no%20logos&image_size=landscape_16_9)

![发布与归档示意](https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=dark%20theme%20web%20app%20page%2C%20release%20publish%20workflow%2C%20select%20gate%20passed%20artifact%2C%20version%20input%2C%20buttons%20for%20RAG%20index%20and%20module%20upsert%2C%20tables%20showing%20results%2C%20Chinese%20UI%20text%2C%20high%20fidelity%20screenshot%2C%20no%20logos&image_size=landscape_16_9)

