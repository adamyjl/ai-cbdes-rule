# 页面设计：vlm 页面（桌面端优先）

## 1) Layout
- 整体采用垂直方向的 Flex 布局：顶部固定区（gaasd 顶栏 + gaasd 工具栏 + Tab 条） + 中间主体滚动区（复用 mllm）。
- 顶部固定区 `position: sticky`（或等效实现），保持在视口顶部；中间主体占用剩余高度并允许内部滚动。
- 响应式策略（桌面端优先）：
  - >= 1280px：Tab 7 个完整显示；工具栏按钮正常间距。
  - 768px~1279px：Tab 允许横向滚动；工具栏按钮可横向滚动。
  - < 768px：Tab 与工具栏均横向滚动，保持可点击但不改变中间主体。

## 2) Meta Information
- Title：VLM
- Description：VLM 页面，复用 MLLM 主体，顶部为 GAASD 风格导航与 7 个中文 Tab。
- Open Graph：
  - og:title = VLM
  - og:description = VLM 页面（复用 MLLM 主体）

## 3) Global Styles
- 主题与色板：沿用 gaasd 既有风格（紫色主色顶栏 + 浅紫工具栏背景 + 白色主体背景）。
- 字体：系统默认中文字体栈；字号以 12–14px 为基础，标题/Tab 可 14px。
- 按钮：默认圆角；hover 有轻微背景变化；disabled 降低透明度并禁用指针。
- Tab：激活态强调（下划线/高亮背景二选一），未激活态 hover 提示。

## 4) Page Structure
1. 顶栏（gaasd TopBar）
2. 工具栏（gaasd Toolbar）
3. 顶部 Tab 条（7 个中文 Tab）
4. 中间主体区域（复用 mllm 页面主体，保持原样）

## 5) Sections & Components

### 5.1 顶栏（gaasd TopBar）
- 位置：页面最顶部，固定高度。
- 内容：菜单式导航（与既有 gaasd TopBar 的菜单结构与交互一致）。
- 交互：点击菜单展开下拉；点击空白处收起。

### 5.2 工具栏（gaasd Toolbar）
- 位置：紧贴顶栏下方，固定高度。
- 内容：图标+文字的快捷操作按钮区域（对齐既有 gaasd Toolbar 的样式与交互）。
- 交互：hover 高亮；busy/不可用时禁用。

### 5.3 顶部 Tab 条（7 个中文 Tab）
- 位置：工具栏下方，单行水平排列。
- Tab 文案（占位命名，确保为中文）：页签一、页签二、页签三、页签四、页签五、页签六、页签七。
- 状态：
  - 默认激活“页签一”。
  - 点击任意 Tab 切换激活态（高亮与可视指示）。
- 约束：Tab 切换不改变“中间主体”内容与交互（中间主体保持原样）。

### 5.4 中间主体（复用 mllm）
- 位置：Tab 条下方，占满剩余空间。
- 内容：直接复用 mllm 页面中间主体的组件树与样式。
- 交互：保持与 mllm 一致，不新增、不删除、不改动既有能力。
