# MLLM 投屏友好浅色主题与顶部 Tab（页面设计）

## Global Styles（全局样式与设计 Token）
- 设计目标：远距离投屏“看得清、分得开、点得准”，整体观感贴近你给的示例图（白底、紫色强调、浅米画布、淡紫卡片）。
- Desktop-first：以 1440×900/1920×1080 为主；投屏时优先保证信息密度与可读性。

### 颜色（必须按指定 RGB 系）
| Token | 用途 | 色值 |
|---|---|---|
| --mllm-bg | 页面背景 | #FFFFFF |
| --mllm-primary | 主强调色（Tab 选中/描边/焦点环） | rgb(95, 2, 107) |
| --mllm-canvas | 画布/大面积内容底色 | rgb(252, 248, 242) |
| --mllm-card | 卡片/函数块底色 | rgb(227, 212, 229) |

### 排版与可读性
- 字体：系统字体栈；数字/代码区域允许等宽字体。
- 基础字号：16px；正文行高 1.5。
- 关键标题/当前 Tab：18–20px（投屏优先）。
- 文本颜色：建议深灰（如 rgb(24,24,27)），避免纯黑刺眼。

### 交互态（投屏可见）
- Hover：背景轻微加深或边框加粗（二选一）；不依赖“极小的颜色差”。
- Focus：2px 外描边（主色）+ 轻微外发光；确保键盘操作演示可见。
- Disabled：降低不透明度 + 显示禁用光标/不可点样式。

---

## Page：MLLM 控制台（/mllm）

### Layout
- 布局体系：Flexbox（纵向主结构）+ 内容区内部按各 Tab 现状使用 Grid/Flex。
- 页面结构：顶部固定区（Top Tabs） + 主内容滚动区（Main）。
- 间距：外层留白 16–24px；模块间距 12–16px；卡片内边距 12–16px。

### Meta Information
- Title：MLLM Console
- Description：投屏友好浅色主题的多模块控制台，顶部 Tab 快速切换。
- Open Graph：
  - og:title = MLLM Console
  - og:description = Casting-friendly light theme + Top Tabs navigation

### Page Structure
1. TopTabs（固定在顶部）
2. MainContent（占满剩余高度，可滚动）

### Sections & Components
#### 1) TopTabs（顶部 Tab 栏，替代左侧导航）
- 高度：56–64px（投屏点击更稳）。
- 左侧（可选）：产品标识/页面标题（不抢占 Tab 空间）。
- 中间：Tab 列表（7 个）
  - 默认：文字深灰；底部 1px 分隔线。
  - 选中态：
    - 底部“粗下划线”或“加粗边框”（2–3px），色值 rgb(95, 2, 107)
    - 文本加粗（font-medium/semibold）
  - Hover：背景轻微着色（使用 --mllm-canvas 的淡化版本）或边框显现。
  - Focus：2px 主色外描边（focus ring），不被背景吞没。
- 右侧（可选）：用户信息/快捷操作（若现有就保留；无则不新增）。
- Tab 过多时：
  - 优先单行展示；不足则允许水平滚动（显示渐隐遮罩提示可滚动）。

#### 2) MainContent（内容区容器）
- 背景：--mllm-bg（白）或在内容区内再包一层 --mllm-canvas（浅米），形成“画布感”。
- 分隔：使用 1px 细边框（浅灰）+ 留白；阴影极轻或不用。
- 滚动：垂直滚动为主；滚动条使用浅色系（避免深色滚动条在白底上突兀）。

#### 3) 各 Tab 内容样式适配原则（不改变功能，仅统一视觉）
- Project Center / Workflow Builder / Prompt Studio / Model Studio / Data Factory / Evaluation Gate / Deployment Hub：
  - 卡片底：--mllm-card（淡紫）用于“重点信息块/函数块/卡片”；普通信息建议仍用白底卡片 + 主色边框点缀，避免全屏紫导致发灰。
  - 大画布/工作区：--mllm-canvas（浅米），网格线/辅助线使用更浅的灰，防止喧宾夺主。
  - 关键状态（成功/运行/失败）：除颜色外，增加图标/标签/描边粗细其中一项，保证投屏可辨。

### Responsive（桌面优先的降级规则）
- >=1280px：TopTabs 单行；MainContent 保持较高信息密度。
- 768–1279px：Tab 允许水平滚动；右侧辅助区可折叠（若现有）。
- <768px：不作为主要目标，仅保证可用（Tab 滚动