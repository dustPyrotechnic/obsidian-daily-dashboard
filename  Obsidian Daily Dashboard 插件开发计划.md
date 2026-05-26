```markdown
# Obsidian Daily Dashboard 插件开发计划

> 创建时间：2026-05-26
> 执行方式：全程由 AI 完成，最大化并行任务
> 目标：开发一个零外部依赖、可上架 Obsidian 官方插件列表的每日仪表盘插件

---

## Phase 0 · 准备工作

**时间预估：第 1 天**
**执行方式：串行**

- [x] clone `obsidian-sample-plugin` 模板，配置 TypeScript + esbuild 构建环境
- [x] 在本地 Obsidian 中确认插件可以正常加载
  - 已使用 `扩展测试仓库/` 作为测试 vault 验证：Obsidian 1.12.7 中 `daily-dashboard` 启用且 loaded 状态为 `true`，插件成功写出默认 `data.json`。
- [x] 按规划建好完整目录结构（所有文件夹和空文件到位）

```
src/
├── main.ts
├── types.ts
├── settings/
│   ├── settings.ts
│   └── settings-tab.ts
├── providers/
│   ├── ai-provider.ts
│   ├── openai-provider.ts
│   ├── ollama-provider.ts
│   └── provider-factory.ts
├── core/
│   ├── vault-reader.ts
│   ├── task-parser.ts
│   └── daily-note.ts
├── widgets/
│   ├── task-widget.ts
│   ├── news-widget.ts
│   └── quiz-widget.ts
├── renderer/
│   ├── dashboard-renderer.ts
│   └── components.ts
└── cache/
    └── content-cache.ts
```

- [x] 编写 `types.ts`，定义所有核心数据接口（**这是整个项目的数据契约，必须最先完成**）
  - `DashboardData` 使用 `widgets: DashboardWidgetData[]` 作为唯一 widget 数据入口，不再额外维护顶层 `tasks` / `news` / `quiz` 字段。

```typescript
// 以下所有 interface 必须在此阶段全部定义完毕

interface AIProvider { ... }
interface CompletionOptions { ... }
interface ProviderConfig { ... }

interface WidgetConfig { ... }
interface PluginSettings { ... }
interface DashboardData { ... }

interface TaskItem { ... }
interface TaskWidgetData { ... }

interface NewsItem { ... }
interface NewsWidgetData { ... }

interface QuizWidgetData { ... }

interface CachedContent { ... }
```

---

## Phase 1 · 双线并行启动

**时间预估：第 2 \~ 4 天**
**执行方式：线 A 与线 B 完全并行**

---

### 线 A · UI 设计与组件库

- [ ] 根据选定的视觉风格参考，让 AI 生成完整单文件 HTML
  - 包含所有 widget 的静态假数据版本
  - 包含骨架屏加载动画
  - 支持深浅色自适应（`prefers-color-scheme`）
  - 不依赖任何外部 CSS 框架或 JS 库
- [ ] 在浏览器中迭代视觉效果，调整至满意
- [ ] 将 HTML 拆解为组件函数库（`renderer/components.ts`）
  - `renderCard(title, icon, body)` — 所有 widget 的外壳
  - `renderListItem(text, priority, checked)` — 任务/要闻列表项
  - `renderCallout(text, type)` — AI 一句话总结、提醒
  - `renderCollapsible(summary, detail)` — 每日一题折叠答案
  - `renderProgressBar(value, max)` — 任务完成率进度条
  - `renderSkeletonCard()` — 骨架屏占位卡片
  - `renderErrorState(message)` — 错误降级状态
- [ ] 实现 `renderDashboard(data: DashboardData, container: HTMLElement)` 主函数（先用假数据填充）
- [ ] 整理所有样式至 `styles.css`
  - 用 Obsidian CSS 变量替换所有硬编码颜色（`var(--background-primary)` 等）
  - 布局使用 CSS Grid `auto-fill + minmax`，自动适配 widget 数量
  - 宽卡片支持 `grid-column: span 2`

---

### 线 B · 后端框架核心模块

以下四个模块互相独立，可同时生成：

- [ ] **`core/daily-note.ts`**
  - 根据配置的文件夹路径和日期格式计算今日笔记路径
  - 笔记不存在时自动创建，写入含 ` ```daily-dashboard``` ` 代码块的初始模板
  - 在 `onLayoutReady` 里注册自动打开行为
  - 支持"启动时自动打开"开关

- [ ] **`core/vault-reader.ts` + `core/task-parser.ts`**
  - `vault-reader`：通过 `app.vault` API 读取指定日期的笔记内容
  - `task-parser`：逐行扫描 Markdown，解析 `- [ ]`（未完成）和 `- [x]`（已完成）任务列表

- [ ] **`cache/content-cache.ts`**
  - 以 `YYYY-MM-DD_widgetId` 为 key
  - 基于 `loadData/saveData` 实现缓存读写
  - 当天命中缓存直接返回，不触发 AI 调用
  - 提供手动清除缓存的方法

- [ ] **`settings/settings.ts` + `settings/settings-tab.ts`**
  - Provider 类型下拉（OpenAI 兼容 / Ollama）
  - API Key 输入框（带遮罩）
  - Base URL 输入框（默认 `https://api.openai.com/v1`）
  - 模型名称输入框
  - "测试连接"按钮（占位，逻辑在 Phase 2 接入）
  - Widget 启用/禁用开关与排序
  - 每个 widget 的 prompt 自定义输入框
  - 今日笔记文件夹路径与日期格式配置
  - 启动时自动打开开关
  - 主题预设选择（简约 / 卡片）

---

## Phase 2 · Provider 层 + 代码块注册（汇合点）

**时间预估：第 5 \~ 7 天**
**执行方式：线 A 与线 B 并行，结束时汇合**

> **注意：此阶段结束时是 UI 与框架两条线的第一次真实汇合，汇合前需做接口对齐检查，确认 `renderDashboard()` 期望的数据格式与框架侧完全一致。**

---

### 线 A · Provider 层实现

- [ ] 实现 `AIProvider` 接口（`providers/ai-provider.ts`）
  - `complete(prompt, options?): Promise<string>`
  - `stream?(prompt, onChunk): Promise<void>`
- [ ] 实现 `OpenAIProvider`（`providers/openai-provider.ts`）
  - 支持自定义 `baseURL`，兼容 DeepSeek、Groq、LM Studio 等所有 OpenAI 格式 endpoint
  - 支持 `systemPrompt`、`temperature`、`maxTokens` 参数
  - 统一错误处理，网络失败时抛出带描述的错误
- [ ] 实现 `OllamaProvider`（`providers/ollama-provider.ts`）
  - 默认 `baseURL` 为 `http://localhost:11434`
  - 调用 `/api/chat` endpoint
- [ ] 实现 `provider-factory.ts`，根据 `PluginSettings` 实例化对应 provider
- [ ] "测试连接"按钮接入真实逻辑（发送简单 prompt，显示成功/失败状态）

---

### 线 B · 代码块处理器注册

- [ ] 在 `main.ts` 里注册 `MarkdownCodeBlockProcessor`，处理 ` ```daily-dashboard``` ` 代码块
- [ ] 将 Phase 1 线 A 产出的 `renderDashboard()` 接入代码块处理器
- [ ] 用静态假数据在真实 Obsidian 环境中验证面板渲染正常
- [ ] 检查 `styles.css` 是否被 Obsidian 全局样式污染，必要时增加选择器命名空间（如 `.dd-` 前缀）

---

### 汇合检查项

- [ ] `DashboardData` interface 与 `renderDashboard()` 期望的结构完全一致
- [ ] 所有组件函数的参数类型与 widget 数据 interface 对齐
- [ ] 面板在 Obsidian 浅色/深色主题下均显示正常

---

## Phase 3 · Widget 数据层实现

**时间预估：第 8 \~ 11 天**
**执行方式：四个任务完全并行**

---

### 任务 Widget（`widgets/task-widget.ts`）

- [ ] 读取昨日笔记内容，拼入 prompt
- [ ] 要求 AI 以 JSON 格式返回今日任务建议

```json
{
  "items": [
    { "text": "任务描述", "priority": "high|medium|low", "fromYesterday": true }
  ],
  "summary": "今日一句话建议"
}
```

- [ ] 实现 JSON 解析，失败时降级为纯文本展示
- [ ] 接入缓存层，当天已生成则跳过 AI 调用
- [ ] 将解析结果填充至 `TaskWidgetData`，传给渲染器

---

### 要闻 Widget（`widgets/news-widget.ts`）

- [ ] 在 prompt 中给定用户配置的新闻源 URL
- [ ] 要求 AI 抓取并总结，以 JSON 格式返回

```json
{
  "items": [
    { "title": "标题", "source": "来源名", "summary": "一句话摘要", "url": "原文链接" }
  ]
}
```

- [ ] 实现 JSON 解析与缓存
- [ ] 将结果填充至 `NewsWidgetData`，传给渲染器

---

### 每日一题 Widget（`widgets/quiz-widget.ts`）

- [ ] 根据用户在设置里选择的题目类型（算法/数学/英语等）生成 prompt
- [ ] 要求 AI 以 JSON 格式返回

```json
{
  "question": "题目内容",
  "hint": "提示（可选）",
  "answer": "完整解析",
  "difficulty": "easy|medium|hard"
}
```

- [ ] 实现 JSON 解析与缓存
- [ ] 答案区域使用 `<details>/<summary>` 折叠，无需 JS
- [ ] 将结果填充至 `QuizWidgetData`，传给渲染器

---

### 骨架屏与异步填充（`renderer/dashboard-renderer.ts`）

- [ ] 将 `renderDashboard()` 改造为两阶段渲染
  - **第一阶段**：立即渲染所有启用 widget 的骨架屏卡片
  - **第二阶段**：用 `Promise.allSettled` 并发触发所有 widget 数据加载
- [ ] 哪个 widget 数据先返回就先填充，加淡入动画过渡
- [ ] 失败的 widget 显示 `renderErrorState()`，不影响其他卡片

---

## Phase 4 · 打磨与发布准备

**时间预估：第 12 \~ 16 天**
**执行方式：以下任务并行**

---

### 错误处理与边界情况

- [ ] 昨日笔记不存在 → 跳过日报分析，任务卡片仅显示 AI 建议
- [ ] AI 返回格式错误 → 降级为纯文本展示，不崩溃
- [ ] 网络超时（超过 15s）→ 显示超时提示，提供手动重试按钮
- [ ] API Key 未配置 → 面板显示引导卡片，不显示报错
- [ ] `Promise.allSettled` 确保单个 widget 失败不影响整体

---

### 首次使用引导

- [ ] 检测到未配置 API Key 时，面板渲染引导卡片
  - 说明插件功能
  - 提供直接跳转设置页的按钮
  - 说明数据隐私（哪些内容会发给 AI）
- [ ] 配置完成后引导卡片自动消失，显示正常面板

---

### 主题预设

- [ ] 实现两套 CSS 变量预设
  - **简约**：无阴影、细边框、高信息密度
  - **卡片**：浮起阴影、大圆角、宽松间距
- [ ] 用 `data-dd-theme` 属性切换，CSS 属性选择器响应
- [ ] 设置页提供预设选择，实时预览效果

---

### README 与发布文件

- [ ] 撰写 README
  - 插件功能介绍与截图
  - 数据流向说明（用户笔记内容会被发送至配置的 AI 服务）
  - 快速上手步骤（5分钟内完成配置）
  - 支持的 AI Provider 列表
- [ ] 完善 `manifest.json`（id、name、description、minAppVersion）
- [ ] 打包干净的 GitHub Release（`main.js`、`styles.css`、`manifest.json`）
- [ ] 在 r/ObsidianMD 和 PKMer 社区发帖征集早期用户反馈
- [ ] 收集反馈、修复问题后，提交 PR 至 `obsidian-releases`

---

## 整体时间线

```
Day 1      Day 2-4          Day 5-7        Day 8-11       Day 12-16
──────────────────────────────────────────────────────────────────────
Phase 0  │  Phase 1          Phase 2        Phase 3        Phase 4
         │  ┌─ 线A: UI ───┐  ┌─ 线A: Provider
准备工作  │  │             │  │                任务Widget    错误处理
types.ts │  └─ 线B: 框架 ─┘  └─ 线B: 代码块   要闻Widget    首次引导
         │  （完全并行）       （汇合点）       每日一题      主题预设
                                              骨架屏异步    README
                                              （完全并行）   （并行）
```

---

## 关键风险点

| 风险                                    | 阶段    | 应对方式                            |
| --------------------------------------- | ------- | ----------------------------------- |
| `types.ts` 定义不完整，后续需要大量返工 | Phase 0 | 宁可多定义可选字段，不遗漏核心结构  |
| UI 与框架数据格式在汇合时不一致         | Phase 2 | 汇合前做接口对齐检查                |
| AI 返回 JSON 格式不稳定                 | Phase 3 | 所有 widget 加 try/catch 降级逻辑   |
| Obsidian 全局样式污染面板样式           | Phase 2 | 所有 CSS 类名加 `.dd-` 命名空间前缀 |
| 审核周期较长                            | Phase 4 | 先发 GitHub Release 积累用户和 star |
