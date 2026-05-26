import type { PluginSettings, WidgetConfig } from "../types";

export type DailyDashboardSettings = PluginSettings;

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
