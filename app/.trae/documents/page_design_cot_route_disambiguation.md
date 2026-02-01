# CoT 路由消歧页面改造 - Page Design Spec（Desktop-first）

## Global Styles（全局）
- Design tokens
  - 背景色：`#0B1220`（深色）/ 内容卡片：`#0F1B2D`
  - 文字：主文 `#E6EDF6`，次级 `#A8B3C7`，弱化 `#7B879C`
  - 强调色：`#4F8CFF`（主操作），成功 `#2AC769`，警告 `#F5A524`，错误 `#FF4D4F`
  - 分割线：`rgba(255,255,255,0.08)`
  - 圆角：卡片 12px；按钮 10px
- Typography
  - H1 20/28, H2 16/24, Body 14/22, Caption 12/18
- Buttons & states
  - Primary：蓝底白字；Hover 提亮 6%；Disabled 降低不透明度 40%
  - Secondary：描边按钮；Hover 背景 `rgba(79,140,255,0.12)`
- Links
  - 默认强调色；Hover 下划线
- Motion
  - 抽屉/面板：200ms ease-out；状态切换（Chip）：120ms

## Breakpoints（响应式策略）
- Desktop（>=1200）：主工作台 3 列布局（左：回放/目录，中：六块内容，右：LLM 对话）
- Tablet（768-1199）：2 列（右侧 LLM 改为可展开抽屉）
- Mobile（<768）：单列堆叠（LLM 全屏抽屉；回放改为顶部折叠）

---

## Page 1：档案列表页（/archives）
### Meta Information
- Title：CoT 路由消歧 - 档案列表
- Description：检索档案并进入路由消歧工作台
- Open Graph：`og:title/og:description/og:type=website`

### Layout
- CSS Grid：页面外层 12 栅格；内容区最大宽 1200px，左右留白自适应
- 顶部固定 Header（64px），主体可滚动

### Page Structure
1) Header
2) 筛选区（Search + Filter）
3) 档案表格列表（含状态）

### Sections & Components
1. Header
   - 左：产品名“CoT 路由消歧”
   - 右：环境标识/帮助入口（只读链接）
2. 筛选区（卡片）
   - 输入框：档案编号/关键词
   - 选择器：状态（未开始/进行中/已完成/异常）、时间范围
   - 按钮：查询、重置
3. 列表区（表格）
   - 列：档案编号、来源、创建时间、状态 Chip、操作
   - 操作：进入工作台（主按钮）
   - 空状态：引导文案 + “清空筛选”

---

## Page 2：CoT 路由消歧工作台页（/disambiguation/:archiveId）
### Meta Information
- Title：CoT 路由消歧 - 工作台
- Description：六块信息确认、LLM 消歧与缺失补齐、最终确认
- Open Graph：`og:title/og:description/og:type=article`

### Layout
- Desktop：CSS Grid 三列
  - 左列 280px：回放/目录
  - 中列 自适应：六块信息卡片流
  - 右列 360px：LLM 对话
- 中列采用“卡片纵向堆叠 + 锚点滚动”，块头部吸顶（sticky）显示块状态

### Page Structure（从上到下）
1) 顶部工具栏（档案信息 + 保存状态）
2) 主体三列（回放/六块/LLM）
3) 底部最终确认栏（sticky）

### Sections & Components
#### 1. 顶部工具栏（Toolbar）
- 左：返回列表、档案编号、状态
- 中：全局校验提示（如“2 个必填缺失/1 个冲突”）
- 右：保存指示（已保存/保存中/失败重试）

#### 2. 左列：档案回放与导航（Replay & Navigator）
- Tabs：
  - 回放：
    - 播放控制：播放/暂停、上一步/下一步、速度（1x/2x）
    - 时间线列表（虚拟滚动）：事件类型、时间、摘要
    - 点击事件：
      - 高亮关联块（blockKey）
      - 打开证据引用抽屉（可选）
  - 目录：
    - 六块列表（Block1-6）+ 状态 Chip（未确认/已确认/阻塞/需LLM）
    - 点击滚动到对应块

#### 3. 中列：六块信息确认（Core Content）
- 结构：6 个 BlockCard（Accordion 可折叠，默认按顺序展开）
- BlockCard 头部
  - 标题（如“Block 2：路由关键信息”）
  - 状态 Chip + 阻塞标记（必填缺失/冲突）
  - 操作：标记已确认、发起 LLM 消歧
- BlockCard 内容
  - 字段表单区（FieldRow 列表）
    - 左：字段名 + 必填星号
    - 中：输入控件（文本/下拉/多选，按字段类型）
    - 右：证据引用入口（popover：引用片段列表）
    - 冲突态：展示“候选值 A/B + 来源”，并提示使用 LLM 或手选
  - 缺失补齐提示区
    - 自动生成的“建议值”以候选 Chip 展示；点击采纳会填入字段并标记来源为“补齐建议”
  - 块级确认
    - 只有当块内必填满足且无未处理冲突时，才允许“确认本块”

#### 4. 右列：LLM 交互面板（Disambiguation Chat）
- ChatHeader
  - 当前上下文：选中的 blockKey / 字段集合
  - 快捷指令：
    - “生成澄清问题”
    - “给出候选值与依据”
    - “检查一致性/必填缺失”
- MessageList
  - 气泡区分 role（user/assistant）
  - assistant 消息内结构化展示：候选值、置信说明、引用证据 refs
- Composer
  - 输入框 + 发送按钮
  - “采纳到字段”操作：对结构化候选提供一键写回（需二次确认弹窗）

#### 5. 底部最终确认栏（Sticky Finalize Bar）
- 左：全局进度（已确认块数/总块数）、阻塞项数量
- 中：差异摘要入口（弹窗/抽屉：本次变更点、LLM 采纳点）
- 右：主按钮“最终确认并生成结果”
  - 点击后：先跑前端校验；再调用后端 finalize
  - 成功：显示结果版本号与时间；页面进入只读或半只读（允许查看回放与记录）

### Interaction States（关键交互状态）
- Loading：首次加载 Skeleton（左列/中列/右列各自骨架）
- Error：块级加载失败仅影响当前块；LLM 调用失败显示可重试与错误原因
- Unsaved changes：字段编辑后在块头部出现“未保存”Dot；离开页面提示确认
- Readonly after finalize：字段输入禁用；仍可浏览证据、消息与回放
