# Windows Server 2025（阿里云）上线部署指南（方案 A）

本项目包含：
- 前端：Vite 构建后的静态站点（`dist/`）
- 后端：FastAPI（`/health`、`/orchestrator/*`、`/gate/*`、`/release/*` 等）
- 轻量 API：Express（仅 `/api/health`，用于前端健康检查占位）
- 数据：`AI_CBDES_DATA_DIR` 目录下的文件 + SQLite（必须迁移并挂载持久化磁盘）

目标：在 Windows Server 2025 上用同域反代方式上线（80/443 对外），并把你本机现有数据一并迁移。

---

## 0. 服务器开通与网络

阿里云安全组建议放行：
- TCP 22（SSH）
- TCP 80（HTTP）
- TCP 443（HTTPS，可选；没域名可先不用）

建议不要直接对公网开放 8000/3001。

---

## 1. 服务器端准备软件（一次性）

### 1.1 安装 Python / Node.js / Git

推荐直接安装：
- Python 3.13（非 Microsoft Store 版本）
- Node.js 20 LTS
- Git for Windows

### 1.2 安装 Visual Studio C++ 编译链（门禁编译需要）

门禁 compile/unit 依赖 `cl.exe` / `vswhere` / `VsDevCmd.bat`。

安装 “Visual Studio Build Tools 2022/2025” 并勾选：
- C++ build tools（MSVC v143）
- Windows 10/11 SDK

验证：
```powershell
& "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -property installationPath
```

---

## 2. 目录规划（建议）

建议固定路径，避免与用户目录耦合：
- 代码：`C:\srv\ai-cbdes-rule\app`
- 数据：`C:\srv\ai-cbdes-rule\data`

数据目录会包含：
- `archive.jsonl`
- `rag.sqlite3`
- `release_modules.json`
- `release_sources\...`
- `gate-workspaces\...`

---

## 3. 从本机迁移代码与数据

### 3.1 迁移代码（推荐：git 或 zip）

方式 A：服务器直接 clone（推荐）
- 在服务器 `C:\srv\ai-cbdes-rule\app` 目录 clone 仓库。

方式 B：本机打包上传
- 本机将整个工程目录打包为 zip 上传到服务器解压。

### 3.2 迁移数据目录（关键）

本机默认数据目录通常为：
- `%LOCALAPPDATA%\ai-cbdes-rule\data`

把该目录下所有内容复制到服务器：
- `C:\srv\ai-cbdes-rule\data`

---

## 4. 配置环境变量（关键）

在服务器设置（机器级）环境变量：
- `AI_CBDES_DATA_DIR=C:\srv\ai-cbdes-rule\data`
- 大模型 Key（三选一，按你实际使用）：
  - `ALIYUN_API_KEY` 或 `DASHSCOPE_API_KEY` 或 `AI_CBDES_ALIYUN_API_KEY`

说明：生产环境不要使用仓库内 `.env` 明文密钥；建议改用服务器系统环境变量并轮换密钥。

---

## 5. 构建与启动（建议使用脚本）

仓库已提供一键部署脚本：
- `C:\srv\ai-cbdes-rule\app\.deploy\windows-server\deploy.ps1`

在服务器 PowerShell（管理员）中执行：
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
cd C:\srv\ai-cbdes-rule\app
powershell -ExecutionPolicy Bypass -File .\.deploy\windows-server\deploy.ps1 -DataDir "C:\srv\ai-cbdes-rule\data" -PublicHost "47.110.142.63"
```

脚本会：
- 创建 Python venv 并安装后端依赖
- 安装 Node 依赖、构建前端（生成 `dist/`）
- 启动/注册三个服务（Caddy 反代、FastAPI、Express）

---

## 6. 访问与验收

访问：
- `http://47.110.142.63/`

验收：
- 页面可打开，左侧菜单可进入：函数生成 / 门禁 / 发布
- FastAPI 健康检查：`http://47.110.142.63/py/health` 返回 `{ ok: true }`
- Express 健康检查：`http://47.110.142.63/api/health` 返回 `{ ok: true }`
- 档案/索引数据能看到迁移前的历史记录

---

## 7. 常见问题

1) 访问 80 OK，但 `/py/*` 404
- 说明反代未按 `/py` 前缀 rewrite 到 FastAPI 根路径；请确认 Caddyfile 采用 `handle_path /py/*`。

2) 门禁编译报错找不到 cl
- 确认安装了 Visual Studio Build Tools（含 C++ workload）。
- 脚本会尝试自动调用 `vswhere + VsDevCmd` 注入环境，但前提是 `vswhere.exe` 存在。

