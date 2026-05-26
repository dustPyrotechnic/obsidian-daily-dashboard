import type { DashboardData } from "../types";

export function renderDashboard(data: DashboardData, container: HTMLElement): void {
    container.empty();

    const dashboard = container.createDiv({ cls: "dd-dashboard" });
    dashboard.dataset.date = data.date;
}
