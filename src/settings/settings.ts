import type { PluginSettings, ProviderType, ThemePreset, WidgetConfig } from "../types";

export type DailyDashboardSettings = PluginSettings;

export const PROVIDER_TYPE_OPTIONS: readonly ProviderType[] = ["openai", "ollama"] as const;

export const THEME_PRESET_OPTIONS: readonly ThemePreset[] = ["minimal", "card"] as const;

/// 每种 provider 的默认 endpoint，用于在设置页切换 provider 时智能联动。
export const DEFAULT_BASE_URLS: Record<ProviderType, string> = {
    openai: "https://api.openai.com/v1",
    ollama: "http://localhost:11434",
};

/// 每种 provider 的默认模型，仅在用户当前模型也是另一 provider 的默认值时联动替换。
export const DEFAULT_MODELS: Record<ProviderType, string> = {
    openai: "gpt-4o-mini",
    ollama: "llama3",
};

export const DEFAULT_WIDGETS: WidgetConfig[] = [
    {
        id: "tasks",
        title: "Tasks",
        enabled: true,
        order: 1,
        width: "wide",
        prompt: "Review yesterday's note and suggest the most important tasks for today.",
    },
    {
        id: "news",
        title: "News",
        enabled: true,
        order: 2,
        prompt: "Summarize today's important news in concise bullet points.",
    },
    {
        id: "quiz",
        title: "Daily Quiz",
        enabled: true,
        order: 3,
        prompt: "Create one useful daily quiz question with an answer explanation.",
    },
];

export const DEFAULT_SETTINGS: DailyDashboardSettings = {
    provider: {
        type: "openai",
        apiKey: "",
        baseURL: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
    },
    widgets: DEFAULT_WIDGETS,
    dailyNote: {
        folder: "Daily",
        dateFormat: "YYYY-MM-DD",
        autoOpenOnStartup: false,
        template: "```daily-dashboard\n```",
    },
    cache: {
        enabled: true,
        ttlHours: 24,
    },
    ui: {
        themePreset: "minimal",
    },
};
