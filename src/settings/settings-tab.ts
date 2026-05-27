import { App, Notice, PluginSettingTab, Setting } from "obsidian";

import type { ProviderType, ThemePreset, WidgetConfig } from "../types";
import type DailyDashboardPlugin from "../main";
import {
    DEFAULT_BASE_URLS,
    DEFAULT_MODELS,
    PROVIDER_TYPE_OPTIONS,
    THEME_PRESET_OPTIONS,
} from "./settings";

/// Phase 1 设置页：仅提供 UI 绑定与持久化，连接测试 / 缓存清除等需 Phase 2+ 模块的能力暂时以 Notice 占位。
export class DailyDashboardSettingTab extends PluginSettingTab {
    private readonly plugin: DailyDashboardPlugin;

    constructor(app: App, plugin: DailyDashboardPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass("dd-settings");

        this.renderProviderSection(containerEl);
        this.renderWidgetsSection(containerEl);
        this.renderDailyNoteSection(containerEl);
        this.renderCacheSection(containerEl);
        this.renderAppearanceSection(containerEl);
    }

    private renderProviderSection(containerEl: HTMLElement): void {
        containerEl.createEl("h2", { text: "AI Provider" });

        const { provider } = this.plugin.settings;

        new Setting(containerEl)
            .setName("Provider type")
            .setDesc("Choose between OpenAI-compatible endpoints and local Ollama.")
            .addDropdown((dropdown) => {
                for (const option of PROVIDER_TYPE_OPTIONS) {
                    dropdown.addOption(option, this.formatProviderLabel(option));
                }
                dropdown.setValue(provider.type).onChange(async (value) => {
                    const nextType = value as ProviderType;
                    this.applyProviderTypeChange(nextType);
                    await this.plugin.saveSettings();
                    this.display();
                });
            });

        new Setting(containerEl)
            .setName("Base URL")
            .setDesc("API endpoint root. OpenAI-compatible providers accept custom URLs.")
            .addText((text) => {
                text.setPlaceholder(DEFAULT_BASE_URLS[provider.type])
                    .setValue(provider.baseURL)
                    .onChange(async (value) => {
                        this.plugin.settings.provider.baseURL = value.trim();
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Model")
            .setDesc("Model identifier sent to the provider, e.g. gpt-4o-mini or llama3.")
            .addText((text) => {
                text.setPlaceholder(DEFAULT_MODELS[provider.type])
                    .setValue(provider.model)
                    .onChange(async (value) => {
                        this.plugin.settings.provider.model = value.trim();
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("API key")
            .setDesc("Stored only in the plugin data file. Leave empty for providers that do not require auth.")
            .addText((text) => {
                text.setPlaceholder("sk-…")
                    .setValue(provider.apiKey ?? "")
                    .onChange(async (value) => {
                        this.plugin.settings.provider.apiKey = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.type = "password";
                text.inputEl.autocomplete = "off";
            });

        new Setting(containerEl)
            .setName("Test connection")
            .setDesc("Verifies that the configured provider is reachable.")
            .addButton((button) => {
                button
                    .setButtonText("Test")
                    .setCta()
                    .onClick(() => {
                        new Notice("Connection test arrives in Phase 2.");
                    });
            });
    }

    private renderWidgetsSection(containerEl: HTMLElement): void {
        containerEl.createEl("h2", { text: "Widgets" });
        containerEl.createEl("p", {
            text: "Toggle widgets, adjust display order, and customise the AI prompt for each card.",
            cls: "setting-item-description",
        });

        const widgetsByOrder = [...this.plugin.settings.widgets].sort(
            (a, b) => a.order - b.order,
        );

        for (const widget of widgetsByOrder) {
            this.renderWidgetBlock(containerEl, widget);
        }
    }

    private renderWidgetBlock(containerEl: HTMLElement, widget: WidgetConfig): void {
        containerEl.createEl("h3", { text: widget.title });

        new Setting(containerEl)
            .setName("Enabled")
            .setDesc("Show this widget on the dashboard.")
            .addToggle((toggle) => {
                toggle.setValue(widget.enabled).onChange(async (value) => {
                    const target = this.findWidget(widget.id);
                    if (!target) return;
                    target.enabled = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Display order")
            .setDesc("Lower numbers render first.")
            .addText((text) => {
                text.inputEl.type = "number";
                text.inputEl.min = "0";
                text.setValue(String(widget.order)).onChange(async (value) => {
                    const target = this.findWidget(widget.id);
                    if (!target) return;
                    const parsed = Number.parseInt(value, 10);
                    if (Number.isNaN(parsed)) return;
                    target.order = parsed;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Prompt")
            .setDesc("Instruction sent to the AI provider for this widget.")
            .addTextArea((textArea) => {
                textArea
                    .setPlaceholder("Describe what you want the AI to produce…")
                    .setValue(widget.prompt)
                    .onChange(async (value) => {
                        const target = this.findWidget(widget.id);
                        if (!target) return;
                        target.prompt = value;
                        await this.plugin.saveSettings();
                    });
                textArea.inputEl.rows = 4;
                textArea.inputEl.addClass("dd-prompt-input");
            });
    }

    private renderDailyNoteSection(containerEl: HTMLElement): void {
        containerEl.createEl("h2", { text: "Daily Note" });

        const { dailyNote } = this.plugin.settings;

        new Setting(containerEl)
            .setName("Folder")
            .setDesc("Vault-relative folder where daily notes live.")
            .addText((text) => {
                text.setPlaceholder("Daily")
                    .setValue(dailyNote.folder)
                    .onChange(async (value) => {
                        this.plugin.settings.dailyNote.folder = value.trim();
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Date format")
            .setDesc("moment.js syntax, e.g. YYYY-MM-DD")
            .addText((text) => {
                text.setPlaceholder("YYYY-MM-DD")
                    .setValue(dailyNote.dateFormat)
                    .onChange(async (value) => {
                        this.plugin.settings.dailyNote.dateFormat = value.trim();
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Template")
            .setDesc("Initial body for newly created daily notes. Include the daily-dashboard code block to render the panel.")
            .addTextArea((textArea) => {
                textArea
                    .setPlaceholder("```daily-dashboard\n```")
                    .setValue(dailyNote.template)
                    .onChange(async (value) => {
                        this.plugin.settings.dailyNote.template = value;
                        await this.plugin.saveSettings();
                    });
                textArea.inputEl.rows = 6;
                textArea.inputEl.addClass("dd-template-input");
            });

        new Setting(containerEl)
            .setName("Auto open on startup")
            .setDesc("Open today's note automatically when Obsidian launches.")
            .addToggle((toggle) => {
                toggle.setValue(dailyNote.autoOpenOnStartup).onChange(async (value) => {
                    this.plugin.settings.dailyNote.autoOpenOnStartup = value;
                    await this.plugin.saveSettings();
                });
            });
    }

    private renderCacheSection(containerEl: HTMLElement): void {
        containerEl.createEl("h2", { text: "Cache" });

        const { cache } = this.plugin.settings;

        new Setting(containerEl)
            .setName("Enable cache")
            .setDesc("Reuse the same widget content during a day to avoid duplicate AI calls.")
            .addToggle((toggle) => {
                toggle.setValue(cache.enabled).onChange(async (value) => {
                    this.plugin.settings.cache.enabled = value;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("TTL (hours)")
            .setDesc("Maximum age of cached widget content before it is regenerated.")
            .addText((text) => {
                text.inputEl.type = "number";
                text.inputEl.min = "1";
                text.setValue(String(cache.ttlHours)).onChange(async (value) => {
                    const parsed = Number.parseInt(value, 10);
                    if (Number.isNaN(parsed) || parsed < 1) return;
                    this.plugin.settings.cache.ttlHours = parsed;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Clear cached widgets")
            .setDesc("Remove every cached widget payload from disk.")
            .addButton((button) => {
                button
                    .setButtonText("Clear cache")
                    .setWarning()
                    .onClick(() => {
                        new Notice("Cache clear arrives once cache module is wired.");
                    });
            });
    }

    private renderAppearanceSection(containerEl: HTMLElement): void {
        containerEl.createEl("h2", { text: "Appearance" });

        const { ui } = this.plugin.settings;

        new Setting(containerEl)
            .setName("Theme preset")
            .setDesc("Visual density of widget cards.")
            .addDropdown((dropdown) => {
                for (const option of THEME_PRESET_OPTIONS) {
                    dropdown.addOption(option, this.formatThemeLabel(option));
                }
                dropdown.setValue(ui.themePreset).onChange(async (value) => {
                    this.plugin.settings.ui.themePreset = value as ThemePreset;
                    await this.plugin.saveSettings();
                });
            });
    }

    /// 当用户保留默认 baseURL/model 时，切换 provider 自动同步对应默认值；
    /// 一旦检测到用户自定义过，就保留其输入避免覆盖。
    private applyProviderTypeChange(nextType: ProviderType): void {
        const provider = this.plugin.settings.provider;
        const currentBaseURL = (provider.baseURL ?? "").trim();
        const currentModel = (provider.model ?? "").trim();

        const isKnownDefaultBaseURL = Object.values(DEFAULT_BASE_URLS).includes(currentBaseURL);
        const isKnownDefaultModel = Object.values(DEFAULT_MODELS).includes(currentModel);

        if (currentBaseURL === "" || isKnownDefaultBaseURL) {
            provider.baseURL = DEFAULT_BASE_URLS[nextType];
        }
        if (currentModel === "" || isKnownDefaultModel) {
            provider.model = DEFAULT_MODELS[nextType];
        }

        provider.type = nextType;
    }

    private findWidget(id: WidgetConfig["id"]): WidgetConfig | undefined {
        return this.plugin.settings.widgets.find((widget) => widget.id === id);
    }

    private formatProviderLabel(type: ProviderType): string {
        switch (type) {
            case "openai":
                return "OpenAI compatible";
            case "ollama":
                return "Ollama (local)";
        }
    }

    private formatThemeLabel(preset: ThemePreset): string {
        switch (preset) {
            case "minimal":
                return "Minimal";
            case "card":
                return "Card";
        }
    }
}
