import type {
    DashboardError,
    NewsItem,
    NewsWidgetData,
    QuizWidgetData,
    TaskItem,
    TaskWidgetData,
    WidgetPriority,
    WidgetStatus,
    WidgetWidth,
} from "../types";

/// 卡片渲染参数
interface RenderCardOptions {
    title: string;
    icon?: string;
    width?: WidgetWidth;
    status?: WidgetStatus;
}

/// 列表项渲染参数
interface RenderListItemOptions {
    text: string;
    priority?: WidgetPriority;
    checked?: boolean;
}

type CalloutType = "info" | "warning" | "success";

const SAFE_NEWS_URL_PROTOCOLS = new Set(["http:", "https:"]);

function sanitizeNewsUrl(rawUrl: string): string | null {
    const trimmedUrl = rawUrl.trim();
    if (trimmedUrl === "") {
        return null;
    }

    try {
        const url = new URL(trimmedUrl);
        return SAFE_NEWS_URL_PROTOCOLS.has(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

/// 通用卡片容器。返回 card body 容器供调用方继续填充。
export function renderCard(
    parent: HTMLElement,
    opts: RenderCardOptions,
): HTMLElement {
    const classes: string[] = ["dd-card"];
    if (opts.width === "wide") {
        classes.push("dd-card--wide");
    }
    if (opts.status) {
        classes.push(`dd-card--${opts.status}`);
    }

    const card = parent.createDiv({ cls: classes.join(" ") });
    if (opts.status) {
        card.dataset.status = opts.status;
    }

    const header = card.createDiv({ cls: "dd-card__header" });
    if (opts.icon) {
        header.createSpan({ cls: "dd-card__icon", text: opts.icon });
    }
    header.createEl("h3", { cls: "dd-card__title", text: opts.title });

    const body = card.createDiv({ cls: "dd-card__body" });
    return body;
}

/// 渲染一行列表项，支持优先级 + 复选状态。
export function renderListItem(
    parent: HTMLElement,
    opts: RenderListItemOptions,
): HTMLElement {
    const classes: string[] = ["dd-list-item"];
    if (opts.priority) {
        classes.push(`dd-priority-${opts.priority}`);
    }
    if (opts.checked) {
        classes.push("dd-list-item--checked");
    }

    const item = parent.createDiv({ cls: classes.join(" ") });

    const marker = item.createSpan({ cls: "dd-list-item__marker" });
    if (typeof opts.checked === "boolean") {
        marker.addClass("dd-list-item__marker--checkbox");
        marker.setText(opts.checked ? "☑" : "☐");
    } else {
        marker.setText("•");
    }

    item.createSpan({ cls: "dd-list-item__text", text: opts.text });

    if (opts.priority) {
        item.createSpan({
            cls: `dd-list-item__priority dd-priority-${opts.priority}`,
            text: opts.priority,
        });
    }

    return item;
}

/// 渲染提示框。
export function renderCallout(
    parent: HTMLElement,
    text: string,
    type: CalloutType = "info",
): HTMLElement {
    const callout = parent.createDiv({ cls: `dd-callout dd-callout--${type}` });
    callout.createSpan({ cls: "dd-callout__text", text });
    return callout;
}

/// 折叠区块，用原生 details/summary，零 JS。
export function renderCollapsible(
    parent: HTMLElement,
    summary: string,
    detail: string,
): HTMLElement {
    const details = parent.createEl("details", { cls: "dd-collapsible" });
    details.createEl("summary", {
        cls: "dd-collapsible__summary",
        text: summary,
    });
    details.createEl("div", {
        cls: "dd-collapsible__detail",
        text: detail,
    });
    return details;
}

/// 进度条。value 会被夹紧到 [0, max]。
export function renderProgressBar(
    parent: HTMLElement,
    value: number,
    max: number,
): HTMLElement {
    const safeMax = max > 0 ? max : 1;
    const safeValue = Math.max(0, Math.min(value, safeMax));
    const percent = Math.round((safeValue / safeMax) * 100);

    const wrapper = parent.createDiv({ cls: "dd-progress" });
    const track = wrapper.createDiv({ cls: "dd-progress__track" });
    const fill = track.createDiv({ cls: "dd-progress__fill" });
    fill.style.width = `${percent}%`;

    wrapper.createSpan({
        cls: "dd-progress__label",
        text: `${safeValue} / ${safeMax}`,
    });

    return wrapper;
}

/// 骨架屏卡片，用于 loading / idle 状态。
export function renderSkeletonCard(
    parent: HTMLElement,
    opts: { title: string; width?: WidgetWidth },
): HTMLElement {
    const body = renderCard(parent, {
        title: opts.title,
        width: opts.width,
        status: "loading",
    });

    body.addClass("dd-skeleton-body");

    for (let i = 0; i < 3; i++) {
        const row = body.createDiv({ cls: "dd-skeleton dd-skeleton__row" });
        if (i === 0) {
            row.addClass("dd-skeleton__row--wide");
        } else if (i === 2) {
            row.addClass("dd-skeleton__row--narrow");
        }
    }

    return body;
}

/// 错误状态渲染（不含外层 card；调用方自行决定是否包裹）。
export function renderErrorState(
    parent: HTMLElement,
    error: DashboardError,
): HTMLElement {
    const wrapper = parent.createDiv({ cls: "dd-error" });
    wrapper.createSpan({ cls: "dd-error__icon", text: "⚠" });
    wrapper.createSpan({ cls: "dd-error__message", text: error.message });

    if (error.rawText) {
        renderCollapsible(wrapper, "查看原始返回", error.rawText);
    }

    if (error.retryable) {
        wrapper.createSpan({
            cls: "dd-error__hint",
            text: "可手动重试",
        });
    }

    return wrapper;
}

/// 任务 widget 渲染。直接消费 TaskWidgetData，不做转换。
export function renderTaskWidget(
    parent: HTMLElement,
    data: TaskWidgetData,
): HTMLElement {
    const section = parent.createDiv({ cls: "dd-widget dd-widget--tasks" });

    if (data.fallbackText) {
        renderCallout(section, data.fallbackText, "warning");
    }

    if (
        typeof data.completedCount === "number" &&
        typeof data.totalCount === "number" &&
        data.totalCount > 0
    ) {
        renderProgressBar(section, data.completedCount, data.totalCount);
    }

    if (data.items.length === 0) {
        renderCallout(section, "今日暂无任务建议", "info");
    } else {
        const list = section.createDiv({ cls: "dd-list" });
        data.items.forEach((item: TaskItem) => {
            const row = renderListItem(list, {
                text: item.text,
                priority: item.priority,
                checked: item.completed,
            });
            if (item.fromYesterday) {
                row.createSpan({
                    cls: "dd-list-item__badge",
                    text: "昨日",
                });
            }
        });
    }

    if (data.summary) {
        renderCallout(section, data.summary, "success");
    }

    return section;
}

/// 要闻 widget 渲染。
export function renderNewsWidget(
    parent: HTMLElement,
    data: NewsWidgetData,
): HTMLElement {
    const section = parent.createDiv({ cls: "dd-widget dd-widget--news" });

    if (data.fallbackText) {
        renderCallout(section, data.fallbackText, "warning");
    }

    if (data.items.length === 0) {
        renderCallout(section, "暂无要闻", "info");
        return section;
    }

    const list = section.createDiv({ cls: "dd-news-list" });
    data.items.forEach((item: NewsItem) => {
        const row = list.createDiv({ cls: "dd-news-item" });

        const safeUrl = sanitizeNewsUrl(item.url);
        if (safeUrl) {
            const titleLink = row.createEl("a", {
                cls: "dd-news-item__title",
                text: item.title,
                href: safeUrl,
            });
            titleLink.setAttr("target", "_blank");
            titleLink.setAttr("rel", "noopener noreferrer");
        } else {
            row.createSpan({
                cls: "dd-news-item__title dd-news-item__title--plain",
                text: item.title,
            });
        }

        const meta = row.createDiv({ cls: "dd-news-item__meta" });
        meta.createSpan({ cls: "dd-news-item__source", text: item.source });
        if (item.publishedAt) {
            meta.createSpan({
                cls: "dd-news-item__time",
                text: item.publishedAt,
            });
        }

        row.createDiv({
            cls: "dd-news-item__summary",
            text: item.summary,
        });
    });

    return section;
}

/// 每日一题 widget 渲染。
export function renderQuizWidget(
    parent: HTMLElement,
    data: QuizWidgetData,
): HTMLElement {
    const section = parent.createDiv({ cls: "dd-widget dd-widget--quiz" });

    if (data.fallbackText) {
        renderCallout(section, data.fallbackText, "warning");
    }

    const header = section.createDiv({ cls: "dd-quiz__header" });
    header.createSpan({
        cls: `dd-quiz__difficulty dd-quiz__difficulty--${data.difficulty}`,
        text: data.difficulty,
    });
    if (data.category) {
        header.createSpan({ cls: "dd-quiz__category", text: data.category });
    }

    section.createEl("p", {
        cls: "dd-quiz__question",
        text: data.question,
    });

    if (data.hint) {
        renderCollapsible(section, "提示", data.hint);
    }

    renderCollapsible(section, "查看答案", data.answer);

    return section;
}
