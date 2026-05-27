import type {
    DashboardData,
    DashboardWidgetData,
    NewsWidgetData,
    QuizWidgetData,
    TaskWidgetData,
} from "../types";
import {
    renderCard,
    renderErrorState,
    renderNewsWidget,
    renderQuizWidget,
    renderSkeletonCard,
    renderTaskWidget,
} from "./components";

/// 两阶段渲染主入口。
///
/// Phase 1（A 线）只负责按 widget.status 做同步分发；
/// 异步加载与状态切换由 Phase 3 的 widget 数据层接入，
/// 届时调用方会在数据回流后重新调用 renderDashboard。
export function renderDashboard(
    data: DashboardData,
    container: HTMLElement,
): void {
    container.empty();

    const dashboard = container.createDiv({ cls: "dd-dashboard" });
    dashboard.dataset.date = data.date;
    dashboard.dataset.generatedAt = data.generatedAt;

    data.widgets.forEach((widget) => {
        renderWidget(dashboard, widget);
    });
}

function renderWidget(
    parent: HTMLElement,
    widget: DashboardWidgetData,
): void {
    switch (widget.status) {
        case "idle":
        case "loading": {
            renderSkeletonCard(parent, {
                title: widget.title,
                width: widget.width,
            });
            return;
        }
        case "error": {
            const body = renderCard(parent, {
                title: widget.title,
                width: widget.width,
                status: "error",
            });
            const error = widget.error ?? {
                message: "未知错误",
                retryable: true,
            };
            renderErrorState(body, error);
            return;
        }
        case "success": {
            const body = renderCard(parent, {
                title: widget.title,
                width: widget.width,
                status: "success",
            });
            renderWidgetBody(body, widget);
            return;
        }
        default: {
            // 类型安全兜底：未知状态视为骨架屏。
            renderSkeletonCard(parent, {
                title: widget.title,
                width: widget.width,
            });
        }
    }
}

function renderWidgetBody(
    body: HTMLElement,
    widget: DashboardWidgetData,
): void {
    if (!widget.data) {
        renderErrorState(body, {
            message: "数据为空",
            retryable: true,
        });
        return;
    }

    switch (widget.id) {
        case "tasks":
            renderTaskWidget(body, widget.data as TaskWidgetData);
            return;
        case "news":
            renderNewsWidget(body, widget.data as NewsWidgetData);
            return;
        case "quiz":
            renderQuizWidget(body, widget.data as QuizWidgetData);
            return;
        default:
            renderErrorState(body, {
                message: `未支持的 widget: ${String(widget.id)}`,
                retryable: false,
            });
    }
}
