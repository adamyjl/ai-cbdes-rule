# 页面设计文档：函数编排与生成页 / 测试门禁页

## 0. 全局设计（适用于所有页面）

### Layout
- 桌面优先（≥1280px）：整体采用 **12 栅格 CSS Grid**（内容区 max-width 1200px，左右留白）。
- 中等屏（≥768px 且 <1280px）：栅格收敛为 8 列，侧栏可折叠。
- 小屏（<768px）：纵向堆叠，侧栏变为抽屉 Drawer。

### Meta Information（默认）
- Title：任务编排与测试门禁工作台
- Description：从档案生成可回放任务，并通过门禁流程验证质量。
- Open Graph：
  - og:title 同 Title
  - og:description 同 Description

### Global Styles（Design Tokens）
- 颜色
  - --bg: #0B1220（深色背景，便于日志阅读）
  - --surface: #111B2E（卡片底）
  - --border: #23314F
  - --text: #E6EDF7
  - --muted: #9FB0D0
  - --primary: #4F8CFF
  - --success: #2BD576
  - --warning: #FFB020
  - --danger: #FF4D4F
- 字体
  - UI：Inter / system-ui；代码/日志：JetBrains Mono / Menlo
  - 标题：20/18/16；正文：14；辅助：12
- 按钮
  - Primary：背景 --primary，hover 提亮 8%，disabled 降低透明度并禁止点击
  - Secondary：描边 --border，hover 改为 --surface 提亮
- 链接
  - 默认 --primary，下划线仅在 hover 显示
- 状态标签（Chip）
  - running：--primary
  - success：--success
  - failed：--danger

### 通用组件
- 顶部导航 TopBar：左侧产品名+导航；右侧可预留“环境/工作区选择”。
- Toast：成功/失败提示；长任务触发后提示“已提交，查看运行中”。
- Empty State：无档案、无任务、无运行记录时给出引导。

---

## 1. 首页

### Layout
- CSS Grid：上方 TopBar；下方两列（左：最近任务，右：最近门禁）。

### Meta Information
- Title：工作台首页
- Description：快速进入任务生成与测试门禁，并查看最近运行状态。

### Page Structure
- Header（TopBar）
- Content：双卡片面板

### Sections & Components
1) 入口导航（TopBar 导航项）
- 导航项：首页 / 函数编排与生成 / 测试门禁

2) 最近任务（Card）
- 表格列：任务名、版本、更新时间、最近一次运行状态、操作（打开/回放）
- 交互：点击“打开”进入函数编排与生成页并定位到任务

3) 最近门禁（Card）
- 表格列：目标、步骤概览（4 个 icon/标签）、状态、时间、操作（查看）

---

## 2. 函数编排与生成页

### Layout
- 顶部 TopBar + 主体左右分栏（桌面）
  - 左侧：档案与任务列表（固定宽 320px，可折叠）
  - 右侧：任务编排与详情（自适应）
- 右侧内部采用“上：任务定义摘要 / 中：编排视图 / 下：运行与回放”三段纵向布局。

### Meta Information
- Title：函数编排与生成
- Description：选择档案生成任务，保存版本并记录运行，可按时间线回放。

### Page Structure
- Sidebar（档案/任务） + Main（生成/持久化/回放）

### Sections & Components
1) 档案选择（Sidebar - Archives）
- 控件：搜索框 + 档案列表（名称、更新时间）
- 状态：未选择时右侧展示引导
- 操作：选择档案后，右侧显示“生成任务”入口

2) 任务列表（Sidebar - Tasks）
- 列表：任务名、版本号
- 操作：点击切换任务；提供“新生成”快捷入口

3) 任务生成（Main - Generate Panel）
- 按钮：生成任务
- 输出：
  - 任务摘要（函数数量、编排边数量/顺序信息）
  - 任务定义展示（代码块，支持复制；JSON/YAML 选择其一即可）

4) 任务持久化（Main - Save Bar）
- 控件：任务名输入（默认可由档案名派生）、保存按钮
- 规则：保存后生成新版本号，并在任务列表刷新显示

5) 编排视图（Main - Orchestration View）
- 展示：函数节点列表 + 执行顺序/依赖关系（可用简化的“顺序列表/依赖列表”呈现）
- 交互：最小可用仅要求“可读”，不强制可视化拖拽；如实现可视化，节点点击展示详情即可

6) 运行与回放（Main - Runs & Playback）
- 运行：按钮“运行一次”
- 历史运行列表：运行时间、状态、耗时
- 回放：选择一次运行后展示时间线（Step 列表）与对应日志
- 日志区域：等宽字体、支持按步骤切换、支持复制与下载

---

## 3. 测试门禁页

### Layout
- 顶部 TopBar + 主体两栏
  - 左侧：门禁配置（表单卡片，宽 360px）
  - 右侧：门禁运行面板（步骤状态 + 日志/覆盖率）

### Meta Information
- Title：测试门禁
- Description：按顺序执行编译、静态检查、单测与覆盖率，并展示日志。

### Page Structure
- Config Panel（左） + Run Panel（右）

### Sections & Components
1) 门禁目标选择（左侧表单）
- 控件：目标类型选择（任务/档案）+ 下拉选择具体目标
- 显示：当前选中目标的基础信息（名称/版本/更新时间）

2) 门禁步骤配置（左侧表单）
- 复选/排序：编译、静态检查、单元测试、覆盖率
- 最小规则：默认顺序固定（compile→static→unit→coverage），如不做排序则仅允许勾选

3) 触发门禁（左侧表单底部）
- Primary Button：触发门禁
- 交互：触发后禁用表单并在右侧显示运行中

4) 步骤状态总览（右侧 - Stepper）
- Stepper：每步显示状态（queued/running/success/failed）+ 耗时
- 失败行为：默认失败即停止后续步骤，并在顶部给出失败原因摘要（从日志首屏提取）

5) 日志查看（右侧 - Logs）
- Tabs：按步骤切换日志
- 行为：支持搜索（可选）、复制、下载完整日志
- 样式：深色代码块，支持自动滚动到最新输出（running 时）

6) 覆盖率汇总（右侧 - Coverage Summary）
- 展示：总体百分比与四项指标（lines/branches/functions/statements）
- 仅在 coverage 步骤完成后显示；失败时显示“未生成覆盖率结果”
