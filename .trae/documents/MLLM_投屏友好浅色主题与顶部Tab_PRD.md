## 1. Product Overview
为现有 Web 应用的 **/mllm 控制台**提供“投屏友好浅色主题”与“左侧导航改顶部 Tab 栏”的 UI 升级。
目标是在会议室/教室投屏环境下，提升可读性、可辨识度与演示效率，并保持原有功能与信息结构不变。

## 2. Core Features

### 2.1 User Roles
本需求不涉及账号体系与权限差异。

### 2.2 Feature Module
本次需求仅涉及以下必要页面：
1. **MLLM 控制台（/mllm）**：顶部 Tab 栏导航、各 Tab 投屏友好浅色主题适配、统一滚动与层级视觉规范。

### 2.3 Page Details
| Page Name | Module Name | Feature description |
|---|---|---|
| MLLM 控制台（/mllm） | 顶部 Tab 栏（替代左侧导航） | 显示 7 个 Tab：Project Center / Workflow Builder / Prompt Studio / Model Studio / Data Factory / Evaluation Gate / Deployment Hub；点击切换内容区；提供清晰的选中态/悬停态/焦点态，满足投屏可辨识。 |
| MLLM 控制台（/mllm） | 浅色主题 Token（指定 RGB 色系） | 应用统一色板：页面背景 #FFFFFF；Tab 强调边框 rgb(95, 2, 107)；画布背景 rgb(252, 248, 242)；卡片/函数块背景 rgb(227, 212, 229)；确保文本与关键控件在投屏距离下清晰可读。 |
| MLLM 控制台（/mllm） | 内容区容器与层级 | 将内容区改为适配浅色背景的容器层级（边框+留白为主、阴影克制）；避免大面积深色底导致投屏发灰；保持各 Tab 原有业务组件与交互不变，仅做样式/布局适配。 |
| MLLM 控制台（/mllm） | 可达性与投屏可用性 | 支持键盘 Tab 导航；焦点态需明显（2px 外描边或 focus ring）；点击热区不小于 36–40px；避免仅用细微颜色变化表达状态。 |
| MLLM 控制台（/mllm） | 滚动条与长内容表现 | 将滚动条从深色系改为浅色系；长列表/表格/画布在浅底下维持分隔线与对齐清晰。 |

## 3. Core Process
- 进入 /mllm 页面后，默认展示 Project Center（保持原默认逻辑）。
- 你在页面顶部通过 Tab 栏切换不同功能区（7 个 Tab），内容区即时切换，页面不跳转。
- 在投屏演示时，你可使用鼠标或键盘焦点在 Tab 间切换；选中态/焦点态始终清晰可见。

```mermaid
graph TD
  A["应用入口"] --> B["/mllm 控制台"]
  B --> C["顶部 Tab：Project Center"]
  B --> D["顶部 Tab：Workflow Builder"]
  B --> E["顶部 Tab：Prompt Studio"]
  B --> F["顶部 Tab：Model Studio"]
  B --> G["顶部 Tab：Data Factory"]
  B