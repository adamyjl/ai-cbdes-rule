# RAG 函数索索引管理 - 页面设计说明（桌面优先）

## 全局设计规范（适用于所有页面）

### Layout

* 桌面优先：内容最大宽度 1200–1440px，居中；左右留白随屏宽自适应。

* 主要布局采用 CSS Grid + Flex 组合：

  * 管理页：左侧“模块分组/筛选”侧栏 + 右侧“函数列表/详情预览”主区域。

  * 详情页：上方元信息栏 + 下方源码编辑器区域。

  * 测试页：左侧输入区 + 右侧结果区（宽屏），窄屏时上下堆叠。

### Meta Information

* RAG 函数索引管理页

  * title: RAG 函数索引管理

  * description: 查看已索引函数总数、按模块筛选、快速定位源码并进入编辑与测试。

  * og:title: RAG 函数索引管理

  * og:description: 让你更快定位与维护 RAG 索引函数。

* 函数详情页

  * title: 函数详情 - {functionName}

  * description: 查看与修改函数源码，快速定位定义位置并进入测试。

* 函数测试页

  * title: 函数测试 - {functionName}

  * description: 为函数配置测试输入，执行并查看结果与日志。

### Global Styles

* 颜色（建议 Token）

  * background: #0B0F1A（深色）或 #F7F8FA（浅色，二选一按现有系统主题）

  * surface/card: #111827（深）/ #FFFFFF（浅）

  * text-primary: #0F172A（浅主题）/ #E5E7EB（深主题）

  * accent: #2563EB（主色，链接与主按钮）

  * success: #16A34A, warning: #F59E0B, danger: #DC2626

* 字体与排版

  * Base: 14–16px；标题层级：24/20/16；代码区使用等宽字体（如 ui-monospace）。

* 组件状态

  * Button: primary/secondary/ghost；hover 提升亮度 6–10%，disabled 降低不透明度至 40%。

  * Link: 默认主色，下划线仅 hover 显示。

* 交互反馈

  * 保存、测试执行：统一用顶部 toast + 按钮 loading 状态。

***

## 1) RAG 函数索引管理页（/rag/functions）

### Page Structure

* 顶部：页面标题 + 统计摘要条

* 主体：左右两栏

  * 左栏（侧栏）：模块分组、模块筛选、快速搜索

  * 右栏（主区）：函数列表（按模块展示）

### Sections & Components

1. 顶部栏（Header）

   * 元素

     * 标题：RAG 函数索引管理

     * 统计卡片：已索引函数总数（大号数字）

     * 可选信息：最后索引更新时间（若系统已有）

   * 交互

     * 统计卡片可点击跳回“全部模块”视图（可选，若有筛选）

2. 左侧栏（Module Sidebar）

   * 模块筛选

     * “模块”标题 + 筛选控件（下拉或可搜索列表）

     * 模块项显示：模块名 + 数量 badge

   * 搜索框

     * Placeholder：搜索函数名/路径/签名

     * 支持回车触发；右侧清除按钮（X）

   * 分组控制

     * 全部展开/全部收起（当模块较多时）

3. 右侧主区（Function List Area）

   * 分组列表（Accordion/Section List）

     * 每组：模块标题行（可折叠）+ 函数行列表

   * 函数行（Row Item）

     * 左侧：函数名（主信息）+ 可选签名（次信息）

     * 右侧：文件路径（弱化文字）+ 状态标签（indexed/pending/failed）

     * 操作按钮：查看源码（primary link button）

   * 空状态

     * 无结果：提示“未找到匹配函数”，给出清空筛选的按钮

4. 列表性能与可用性（非功能性，但影响体验）

   * 列表超过一定行数建议虚拟滚动（可选实现建议，不强制）

   * 模块标题行吸顶（sticky）用于长列表定位

***

## 2) 函数详情（源码查看/编辑）页（/rag/functions/:functionId）

### Page Structure

* 顶部：返回按钮 + 函数标题 + 主要操作（编辑/保存/去测试）

* 中部：元信息面板（两列信息）

* 下部：源码查看/编辑器（占主要高度）

### Sections & Components

1. 顶部操作栏（Top Action Bar）

   * 左侧

     * 返回：回到 RAG 函数索引管理页（保留筛选条件的 query 参数优先）

   * 中间

     * 标题：{functionName}

     * 副标题：{module} · {filePath}

   * 右侧按钮

     * “进入编辑”（只读态）

     * “保存”（编辑态显示，disabled=未改动）

     * “取消/撤销改动”（编辑态）

     * “去测试”（始终可见）

2. 元信息面板（Meta Panel）

   * 卡片布局，两列网格（Grid 2 columns）

   * 字段

     * 模块、文件路径、行号范围、签名/参数（若有）、索引状态、更新时间

   * 快捷操作

     * “复制路径”按钮

3. 源码区（Source Viewer/Editor）

   * 只读态

     * 行号 + 代码高亮

     * 工具栏：复制源码

   * 编辑态

     * 文本编辑器（保留行号显示）

     * 保存前校验：最小校验（非空）+ 可选提示“修改后请执行测试”

   * 错误态

     * 获取源码失败：展示错误摘要 + 重试按钮

     * 保存失败：toast + 错误详情折叠区（可选）

***

## 3) 函数测试页（/rag/functions/:functionId/test）

### Page Structure

* 顶部：返回函数详情 + 标题

* 主体：左右两栏（宽屏）

  * 左：测试输入

  * 右：测试结果

### Sections & Components

1. 顶部栏

   * 返回：回到函数详情页

   * 标题：函数测试 - {functionName}

   * 运行按钮：执行测试（primary）

   * 运行状态：loading / 运行中计时（可选）

2. 左侧：测试输入（Test Input Panel）

   * 输入框（Textarea 或代码编辑器）

     * 默认提示：填写 JSON 或文本输入

     * 支持“格式化 JSON”（若输入可解析）

   * 预设（可选，若系统已有/容易复用）

     * 最近一次输入快速回填

3. 右侧：测试结果（Result Panel）

   * 结果摘要

     * 状态标签：success/failed

     * 耗时（ms）

   * 结果输出

     * output（可折叠）

     * errorMessage（失败时高亮）

   * 日志区

     * logs 展示（等宽字体，支持复制）

4. 空状态与错误处理

   * 未运行：提示“填写输入后执行测试”

   * 运行失败：展示错误摘要 + 重试按钮

