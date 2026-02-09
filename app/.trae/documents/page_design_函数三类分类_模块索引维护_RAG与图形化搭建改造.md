# 页面设计说明（桌面优先）— 函数三类分类 + 模块索引/维护 + RAG/图形化搭建改造

## Global Styles
- 背景：深色（#0B0F1A），面板：#111827，边框：#1F2937
- 字体：基础 14px；标题 16–18px；代码/日志等宽字体
- 标签色：模块 Tag（geekblue）；分类 Tag：callable=green、domain=gold、utility=default
- 反馈：所有保存/任务启动/错误统一用 toast；长任务用进度条 + 可取消

---

## 1) RAG 管理页（改造）
### Layout
- 桌面优先三段式：上方“索引/任务区”，中部“检索区”，下方“函数库区”。
- “模块维护/规则预览”放在函数库区的 Tab 内，避免新增页面。

### Meta Information
- title: RAG 管理
- description: 扫描索引、模块维护、函数分类与检索。

### Page Structure
- Header：页面标题 + RootDir 输入 + 快捷按钮（扫描、开始索引、补全描述）。
- Content Tabs（建议 3 个 Tab）：
  1) “检索”：RAG query + 命中列表
  2) “函数库”：函数列表（模块/分类/搜索/批量）+ 函数详情抽屉
  3) “模块维护”：模块索引表 + 规则编辑/预览

### Sections & Components
#### A. 索引/任务区（顶部 Card）
- Root Dir 输入框 + “按 RootDir 过滤”开关（与函数库一致）。
- 任务按钮：扫描、开始索引、补全描述；任务状态：stage + percent + 当前文件/函数数。
- 取消按钮：当任务 stage=running 时可见。

#### B. 函数库 Tab（核心交互改造）
- 筛选条：
  - 模块 Select（来自 module_index.enabled 列表；同时提供“全部”）
  - 分类 Segmented/Select：全部 / callable / domain / utility
  - 搜索 Input：函数名/签名/路径/描述摘要
- 表格列（新增/调整）：模块（Tag）/分类（Tag）/函数/签名/文件/行/索引状态/操作。
- 行点击：打开“函数详情抽屉”。
- 批量操作（可选但建议）：批量改模块、批量改分类、批量删除。

#### C. 函数详情抽屉（增强）
- 顶部摘要：module + category Tag + display_name。
- 元数据表单（新增）：
  - 模块：Select（可搜索；显示来源只读：module_source）
  - 分类：Radio/Select（三类；显示来源只读：category_source）
  - 描述：doc_zh/doc_en（可选编辑）
- 保存策略：
  - “仅保存元数据”
  - “保存并重向量化”（会 reset embedding）
- 源码区：只读/编辑切换（沿用现有交互）。

#### D. 模块维护 Tab（模块索引/发现规则可视化）
- 左侧：模块列表 Table
  - 列：module_key、display_name、enabled、priority、allow_llm_override、updated_at
  - 行操作：编辑、停用/启用
- 右侧：模块编辑 Drawer
  - 基础信息：module_key（只读或新建可填）、display_name、enabled、priority、allow_llm_override
  - 规则编辑：rules（可增删行；kind=path_prefix/path_regex + pattern）
  - 规则预览：输入 file_path，实时展示“命中模块 + 命中规则 + 计算链路（manual/rule/llm/heuristic）”。

---

## 2) 图形化搭建页（改造）
### Layout
- 三栏布局：左“函数选择器”，中“画布”，右“属性与测试”。
- 左栏宽 280px；右栏 360px；中间自适应。

### Meta Information
- title: 图形化搭建
- description: 基于模块与分类拖拽函数生成工作流。

### Page Structure
- 左栏：RootDir + 模块筛选 + 分类筛选 + 搜索 + Tree（模块→分类→函数）。
- 中栏：Canvas（拖拽放置、连线、选择、删除）。
- 右栏：Inspector（节点元信息、参数、IO 映射、测试）。

### Sections & Components
#### A. 函数选择器（左栏）
- 默认分类过滤：仅 callable（有“显示全部分类”开关）。
- Tree 分组：
  - 一级：模块（module_key/display_name）
  - 二级：分类（callable/domain/utility）
  - 三级：函数（可拖拽；点击打开函数详情抽屉）
- 拖拽 payload 必含：function_id、display_name、module、category、inputs_json、outputs_json。

#### B. 画布（中栏）
- 节点展示：标题 + 模块/分类 Tag + 状态角标（未配置/可测试/失败）。
- 连线校验（最小可用）：
  - 若输入输出 JSON 存在 fields，则提示不匹配；不存在则允许但提示“未声明 IO”。

#### C. 属性与测试（右栏）
- 节点属性：显示绑定的 function_id、module、category（只读）；可编辑参数与映射。
- 测试：沿用“测试命令 + cwd + timeout”，一键执行并回显 stdout/stderr。

## Interaction Notes（两页联动）
- 你在 RAG 管理页修正 module/category 后，图形化搭建页的左侧树在下次展开/刷新时应反映最新分组。
- 所有“来源字段”（module_source/category_source）在 UI 中只读展示，用于解释为什么被分到该模块/分类。
