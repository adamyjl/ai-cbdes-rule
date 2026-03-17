# autostudio-ide 部署到 /gaasd 说明（不影响现有站点与 /mllm）

## 1.目标与约束
- 目标：让 `autostudio-ide` 以“独立子应用”方式上线到 `https://<你的域名>/gaasd/`。
- 约束：
  - 不改动现有主站根路径 `/` 的资源与路由策略
  - 不影响现有 `/mllm`（主站 React 路由页面）
  - 不影响现有 `/api/*` 与 `/py/*` 反向代理

## 2.推荐部署策略（子路径静态站点）
- 让 Caddy 对 `/gaasd/*` 单独做 `handle_path`，将该前缀映射到 `autostudio-ide/dist`。
- Vite 构建时将 `base` 设置为 `/gaasd/`，确保静态资源引用正确。

## 3.构建准备（Vite base）
在 `autostudio-ide/vite.config.ts` 增加：
- `base: '/gaasd/'`

说明：
- 如果未来在 autostudio-ide 内引入 React Router，需要同时将 router basename 设为 `/gaasd`，并保留服务端的 SPA fallback。

## 4.构建命令
在服务器（或 CI）上执行：
```bash
cd autostudio-ide
npm ci
npm run build
```
产物默认输出到：`autostudio-ide/dist/`

## 5.Caddy 配置（关键：只拦截 /gaasd，不碰 /mllm）
现有网关入口位于：`app/.runtime/Caddyfile`（运行时由 `app/.deploy/windows-server/deploy.ps1` 生成）。

当前仓库的部署脚本已内置 `/gaasd` 的处理逻辑（含缓存策略），见：
- `app/.deploy/windows-server/deploy.ps1` 的 `Write-Caddyfile(...)`
- 其中包含：
  - `/gaasd` 自动补 `/gaasd/`
  - `handle_path /gaasd/* { root * ...\autostudio-ide\dist; try_files {path} /index.html; ... }`
  - `/gaasd/assets/*` 走 immutable 缓存，其余页面走 `no-store`（避免更新后仍命中旧 HTML）

### 5.1 手动验证用改法（直接改 Caddyfile 进行试跑）
在 `(ai_cbdes_app)` 段内、`handle { ... }` 默认站点处理之前，新增：
```caddy
handle_path /gaasd/* {
  root * C:\srv\ai-cbdes-rule\autostudio-ide\dist
  try_files {path} /index.html
  file_server
}
```
为什么用 `handle_path`：
- 它会剥离 `/gaasd` 前缀，使 `/gaasd/assets/*` 能在 dist 下正确命中 `/assets/*`。
- `try_files` 保证未来扩展成 SPA 子路由时也可刷新不 404。

### 5.2 正式改法（部署脚本已集成）
因为 `deploy.ps1` 会重写 `app/.runtime/Caddyfile`，正式部署应以脚本生成结果为准：

- `/gaasd` 的 Caddy 配置已集成在 `Write-Caddyfile(...)`。
- autostudio-ide 的安装与构建已集成在 `Ensure-GaasdBuild(...)`（在部署流程中会执行 `npm ci` + `npm run build`）。

## 6.上线/回滚步骤（Windows 服务场景）
### 6.1 上线
1) 构建 autostudio-ide：生成 `autostudio-ide/dist`
2) 更新 deploy.ps1（或临时手改 Caddyfile 试运行）
3) 重启 `ai-cbdes-caddy` 服务（或运行 `start_caddy.cmd`）
4) 验证：
   - 打开 `/gaasd/`：页面能加载且资源请求为 `/gaasd/assets/...`
   - 打开 `/mllm`：确认不受影响
   - 检查 `/api/health` 与 `/py/health`：确认不受影响

### 6.2 回滚
- 只需删除/注释 Caddy 中 `/gaasd` 的 `handle_path` 段并重启 Caddy；不涉及主站 dist 与 /mllm 路由。

## 7.常见问题（排障清单）
- 现象：进入 `/gaasd/` 白屏，控制台 404 静态资源
  - 检查 Vite 是否设置 `base: '/gaasd/'`
- 现象：刷新 `/gaasd/xxx` 404
  - 检查是否配置了 `try_files {path} /index.html`
- 现象：影响了主站 `/` 或 `/mllm`
  - 检查 `/gaasd` 的 handler 是否放在默认 `handle { ... }` 之前，且匹配规则仅为 `/gaasd/*`

## 8.与主站代码的关系（边界提醒）
- `/gaasd/` 是独立构建产物（`autostudio-ide/dist`），不走主站 React Router。
- `/mllm` 与 `/vlm` 属于主站（`app/dist`）的前端路由页面，由 Caddy 的默认 `handle { try_files ... /index.html }` 处理。
- `/py/*` 仍反代 FastAPI，`/api/*` 仍反代 Express（health stub）。
