# 数据迁移与验收清单（Windows → Windows Server）

本项目的“数据库”= 数据目录（`AI_CBDES_DATA_DIR`）下的文件与 SQLite。

---

## 1. 本机数据目录定位

默认（多数情况下）：
- `%LOCALAPPDATA%\ai-cbdes-rule\data`

如果你本机设置过环境变量 `AI_CBDES_DATA_DIR`，则以该值为准。

---

## 2. 需要迁移的内容

把整个数据目录完整复制到服务器（不要挑文件）：
- `archive.jsonl`
- `rag.sqlite3`
- `release_modules.json`
- `release_sources\...`
- `gate-workspaces\...`

---

## 3. 迁移方式（推荐两种）

### 方式 A：scp（Windows 自带 OpenSSH 客户端）

在本机 PowerShell：
```powershell
$src = "$env:LOCALAPPDATA\ai-cbdes-rule\data"
scp -r "$src" "Administrator@47.110.142.63:C:/srv/ai-cbdes-rule/data"
```

如果服务器目录不存在，先在服务器创建：
```powershell
New-Item -ItemType Directory -Force -Path C:\srv\ai-cbdes-rule\data | Out-Null
```

### 方式 B：zip 打包上传

本机把数据目录压缩后上传，再在服务器解压。

---

## 4. 服务器端必须设置的环境变量

（机器级）
- `AI_CBDES_DATA_DIR=C:\srv\ai-cbdes-rule\data`

---

## 5. 验收清单

### 5.1 服务端健康检查

- 推荐使用域名 HTTPS 访问：
  - `https://www.ai-cbdes-rule.com/py/health` 返回 `{ "ok": true }`
  - `https://www.ai-cbdes-rule.com/api/health` 返回 `{ "ok": true }`
- 仅在调试时使用 IP + HTTP：`http://<公网IP>/py/health` / `http://<公网IP>/api/health`

### 5.2 数据验收

- 档案管理页能看到迁移前的历史 `orchestrator.generate` / `gate.run` / `release.publish`
- RAG 管理页能看到迁移前的索引结果（若之前做过索引）

### 5.3 门禁验收（可选）

- 选择任意 `orchestrator.generate` 结果，门禁 `compile/static/unit/coverage` 可跑通
- 若编译器缺失：需要安装 Visual Studio Build Tools（C++ workload）

---

## 6. 端口与 DNS（必做）

- 域名 A 记录：`www.ai-cbdes-rule.com` → `47.110.142.63`
- 安全组放行：`80` 与 `443`（80 用于 HTTP→HTTPS 跳转及证书签发/续期）
- 访问建议：生产环境统一使用 `https://www.ai-cbdes-rule.com`（不要用 `https://<IP>`，证书不会匹配裸 IP）
