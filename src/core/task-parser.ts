import { TaskItem, WidgetPriority } from "../types";

/// 行级正则：匹配 `- [ ] xxx` / `* [x] xxx` / `+ [X] xxx`，允许任意前导缩进。
const TASK_LINE_RE = /^\s*[-*+]\s+\[( |x|X)\]\s+(.+)$/;

/// 高优先级标记：Obsidian Tasks 的 ⏫ 以及通用 `(!high)` / `[high]`
const HIGH_TOKENS: RegExp[] = [
    /⏫/g,
    /\(!high\)/gi,
    /\[high\]/gi,
];

/// 低优先级标记：⏬ 与 🔽 都视为低，外加 `(!low)` / `[low]`
const LOW_TOKENS: RegExp[] = [
    /🔽/g,
    /⏬/g,
    /\(!low\)/gi,
    /\[low\]/gi,
];

/// 逐行扫描 Markdown，解析 `- [ ]` / `- [x]` 任务列表（含缩进项）。
/// 设计上只做正则匹配，避免引入 markdown AST 依赖。
export function parseTasks(
    markdown: string,
    opts?: { sourcePath?: string },
): TaskItem[] {
    if (!markdown) {
        return [];
    }
    const lines = markdown.split(/\r?\n/);
    const items: TaskItem[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) {
            continue;
        }
        const match = line.match(TASK_LINE_RE);
        if (!match) {
            continue;
        }
        const checkbox = match[1] ?? " ";
        const rawText = match[2] ?? "";
        const { text, priority } = extractPriority(rawText);
        const item: TaskItem = {
            text,
            priority,
            fromYesterday: false,
            completed: checkbox === "x" || checkbox === "X",
            sourceLine: i + 1,
        };
        if (opts?.sourcePath) {
            item.sourcePath = opts.sourcePath;
        }
        items.push(item);
    }
    return items;
}

/// 便捷包装：从已读取的笔记内容解析，自动透传 sourcePath。
export function parseTasksFromNote(note: {
    text: string;
    path: string;
}): TaskItem[] {
    return parseTasks(note.text, { sourcePath: note.path });
}

/// 抽取并剥离优先级标记。判定顺序：高优先 > 低优先 > 默认 medium。
/// 同一行若同时出现高低标记，以高优先为准，但两类标记都从文本中剥离。
function extractPriority(raw: string): { text: string; priority: WidgetPriority } {
    let priority: WidgetPriority = "medium";
    let text = raw;

    /// 用 replace 同时检测+剥离，避免带 g 标志的 test() 推进 lastIndex 引发状态污染
    let hitHigh = false;
    for (const re of HIGH_TOKENS) {
        const replaced = text.replace(re, "");
        if (replaced !== text) {
            hitHigh = true;
            text = replaced;
        }
    }
    let hitLow = false;
    for (const re of LOW_TOKENS) {
        const replaced = text.replace(re, "");
        if (replaced !== text) {
            hitLow = true;
            text = replaced;
        }
    }

    if (hitHigh) {
        priority = "high";
    } else if (hitLow) {
        priority = "low";
    }

    /// 把剥离标记后产生的连续空白压成单个空格，并去掉首尾空白
    text = text.replace(/\s{2,}/g, " ").trim();
    return { text, priority };
}
