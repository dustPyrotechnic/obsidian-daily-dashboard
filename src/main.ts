import { Notice, Plugin } from "obsidian";

import { autoOpenIfEnabled } from "./core/daily-note";
import { DEFAULT_SETTINGS, type DailyDashboardSettings } from "./settings/settings";
import { DailyDashboardSettingTab } from "./settings/settings-tab";

export default class DailyDashboardPlugin extends Plugin {
    settings: DailyDashboardSettings = DEFAULT_SETTINGS;

    async onload(): Promise<void> {
        await this.loadSettings();

        this.addSettingTab(new DailyDashboardSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            void this.autoOpenDailyNote();
        });

        this.registerMarkdownCodeBlockProcessor("daily-dashboard", (_source, el) => {
            this.renderPhaseZeroPlaceholder(el);
        });
    }

    async loadSettings(): Promise<void> {
        const savedSettings = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, savedSettings);

        if (!savedSettings) {
            await this.saveSettings();
        }
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    private async autoOpenDailyNote(): Promise<void> {
        try {
            await autoOpenIfEnabled(this.app, this.settings.dailyNote);
        } catch (err) {
            console.error("Daily Dashboard failed to auto-open today's note.", err);
            new Notice("Daily Dashboard: failed to open today's note.");
        }
    }

    private renderPhaseZeroPlaceholder(container: HTMLElement): void {
        container.empty();

        const dashboard = container.createDiv({ cls: "dd-dashboard" });
        const card = dashboard.createDiv({ cls: "dd-card" });

        card.createEl("strong", { text: "Daily Dashboard" });
        card.createEl("p", { text: "Phase 0 environment is ready." });
    }
}
