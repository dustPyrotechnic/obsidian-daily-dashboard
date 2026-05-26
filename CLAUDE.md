# Obsidian Daily Dashboard · 项目说明

> 这是一个 Obsidian 第三方插件项目，目标是在 Obsidian 的每日笔记中渲染一个 AI 驱动的仪表盘代码块。
> 开发方式：全程由 AI 完成，最大化并行任务。

---

## 项目定位

| 项 | 内容 |
|----|------|
| 类型 | Obsidian 官方插件（计划提交至 `obsidian-releases`） |
| 外部依赖 | **零运行时依赖**（仅依赖 Obsidian API 与浏览器内置能力） |
| 触发方式 | 在笔记中插入 ` ```daily-dashboard``` ` 代码块 |
| AI Provider | OpenAI 兼容（含 DeepSeek / Groq / LM Studio）+ Ollama |

---

## 技术栈与构建

| 层 | 技术 |
|----|------|
| 语言 | TypeScript（4 空格缩进） |
| 构建 | esbuild（基于 `obsidian-sample-plugin` 模板） |
| 样式 | 原生 CSS + Obsidian CSS 变量（不引入任何 CSS 框架） |
| 数据存储 | Obsidian `loadData` / `saveData`（缓存 + 设置） |
| 网络 | `fetch`（不引入 axios 等额外 HTTP 库） |

---

## 本地开发边界

- 外层当前目录是唯一 Git 仓库，也是插件源码、构建配置、发布产物的工作区。
- `扩展测试仓库/` 仅作为 Obsidian 测试 vault 使用，不在其中初始化 Git。
- 不向 `扩展测试仓库/` 写入 README、计划文档、源码结构等实质性项目文件。
- 需要验证插件时，只把构建产物复制到 `扩展测试仓库/.obsidian/plugins/daily-dashboard/`。
- 不改动用户真实 Obsidian vault；所有加载验证优先使用 `扩展测试仓库/`。

---

## 目录结构

```
src/
├── main.ts                       # 插件入口，注册 MarkdownCodeBlockProcessor
├── types.ts                      # 全项目数据契约，Phase 0 一次定义完整
├── settings/
│   ├── settings.ts               # 设置数据结构与默认值
│   └── settings-tab.ts           # 设置 UI
├── providers/
│   ├── ai-provider.ts            # AIProvider 接口定义
│   ├── openai-provider.ts        # OpenAI 兼容实现（含 DeepSeek/Groq/LM Studio）
│   ├── ollama-provider.ts        # Ollama 实现（默认 http://localhost:11434）
│   └── provider-factory.ts       # 根据设置实例化 provider
├── core/
│   ├── vault-reader.ts           # 通过 app.vault API 读取笔记
│   ├── task-parser.ts            # 解析 - [ ] / - [x] 任务
│   └── daily-note.ts             # 计算/创建今日笔记，注册 onLayoutReady
├── widgets/
│   ├── task-widget.ts            # 任务建议（基于昨日笔记）
│   ├── news-widget.ts            # 要闻摘要
│   └── quiz-widget.ts            # 每日一题
├── renderer/
│   ├── dashboard-renderer.ts     # 两阶段渲染（骨架屏 → 异步填充）
│   └── components.ts             # 纯函数组件库
└── cache/
    └── content-cache.ts          # 当日缓存，key 格式 YYYY-MM-DD_widgetId
```

---

## 核心约定（违反需特别说明）

### 数据契约
- `types.ts` 必须在 Phase 0 一次定义完整，宁可多加可选字段也不要遗漏核心结构。
- 所有 widget 数据接口（`TaskWidgetData` / `NewsWidgetData` / `QuizWidgetData`）必须能被 `renderDashboard(data: DashboardData)` 直接消费，**禁止在渲染器内部做数据转换**。
- `DashboardData` 以 `widgets: DashboardWidgetData[]` 作为唯一 widget 数据入口，禁止维护顶层 `tasks` / `news` / `quiz` 副本。

### CSS 命名空间
- 所有 CSS 类名必须以 `.dd-` 前缀开头，避免被 Obsidian 全局样式污染或污染 Obsidian。
- 所有颜色必须使用 Obsidian CSS 变量（如 `var(--background-primary)`），禁止硬编码颜色。
- 布局使用 CSS Grid `auto-fill + minmax`，宽卡片用 `grid-column: span 2`。

### 缓存策略
- 缓存 key 格式固定为 `YYYY-MM-DD_widgetId`。
- 当日命中缓存直接返回，**不触发 AI 调用**。
- 必须提供手动清除缓存的方法（设置页 / 命令）。

### 错误降级（必须全部覆盖）
| 场景 | 处理 |
|------|------|
| 昨日笔记不存在 | 跳过日报分析，任务卡片仅显示 AI 建议 |
| AI 返回非 JSON | `try/catch` 降级为纯文本展示，**不崩溃** |
| 网络超时（>15s） | 显示超时提示 + 手动重试按钮 |
| API Key 未配置 | 显示引导卡片，不报错 |
| 单个 widget 失败 | `Promise.allSettled` 隔离，不影响其他卡片 |

### Provider 实现
- 所有 provider 实现 `AIProvider` 接口：`complete(prompt, options?): Promise<string>`。
- `OpenAIProvider` 必须支持自定义 `baseURL`，以兼容所有 OpenAI 格式 endpoint。
- 网络失败时抛出带描述的错误，调用方决定如何降级。

### 渲染策略
- `renderDashboard()` 是两阶段：
  1. 立即渲染所有启用 widget 的骨架屏卡片
  2. `Promise.allSettled` 并发触发所有 widget 数据加载，谁先回来谁先填充
- 答案折叠用原生 `<details>/<summary>`，**不写 JS**。

---

## 开发阶段速查

| Phase | 工期 | 并行模式 | 必须先完成 |
|-------|------|----------|------------|
| 0 · 准备 | Day 1 | 串行 | — |
| 1 · 双线并行 | Day 2–4 | A 线 UI / B 线框架完全独立 | Phase 0 的 `types.ts` |
| 2 · Provider + 代码块（**汇合点**） | Day 5–7 | A 线 / B 线并行，结束做接口对齐 | Phase 1 全部 |
| 3 · Widget 数据层 | Day 8–11 | 四任务（task/news/quiz/骨架屏）完全并行 | Phase 2 汇合通过 |
| 4 · 打磨与发布 | Day 12–16 | 错误处理 / 引导 / 主题 / README 并行 | Phase 3 全部 |

### Phase 2 汇合检查清单
- [ ] `DashboardData` 与 `renderDashboard()` 期望结构完全一致
- [ ] 所有组件函数参数类型与 widget 数据 interface 对齐
- [ ] 面板在 Obsidian 浅色/深色主题下均正常

---

## AI Widget JSON 契约

每个 widget 的 prompt 必须要求 AI 严格返回以下结构（解析失败一律降级为纯文本）：

**Task Widget**
```json
{
  "items": [
    { "text": "任务描述", "priority": "high|medium|low", "fromYesterday": true }
  ],
  "summary": "今日一句话建议"
}
```

**News Widget**
```json
{
  "items": [
    { "title": "标题", "source": "来源名", "summary": "一句话摘要", "url": "原文链接" }
  ]
}
```

**Quiz Widget**
```json
{
  "question": "题目内容",
  "hint": "提示（可选）",
  "answer": "完整解析",
  "difficulty": "easy|medium|hard"
}
```

---

## 发布准备清单

- [ ] `manifest.json`：id、name、description、minAppVersion 完整
- [ ] README：功能介绍 + 截图 + 数据流向说明（哪些内容会发给 AI）+ 5 分钟上手
- [ ] GitHub Release 产物只包含 `main.js` / `styles.css` / `manifest.json`
- [ ] r/ObsidianMD + PKMer 社区发帖收集反馈
- [ ] 修复问题后提交 PR 至 `obsidian-releases`

---

## 关键风险与对策

| 风险 | 阶段 | 对策 |
|------|------|------|
| `types.ts` 定义不完整导致返工 | Phase 0 | 宁可多定义可选字段 |
| UI 与框架数据格式不一致 | Phase 2 | 汇合前强制接口对齐检查 |
| AI 返回 JSON 不稳定 | Phase 3 | 全 widget `try/catch` + 纯文本降级 |
| Obsidian 全局样式污染 | Phase 2 | 强制 `.dd-` 命名空间前缀 |
| 官方审核周期长 | Phase 4 | 先发 GitHub Release 积累用户 |

---

## 计划原文

完整开发计划：`./ Obsidian Daily Dashboard 插件开发计划.md`（注意文件名首字符为空格）
