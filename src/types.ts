export type ProviderType = "openai" | "ollama";
export type ResponseFormat = "text" | "json";
export type WidgetId = "tasks" | "news" | "quiz";
export type WidgetPriority = "high" | "medium" | "low";
export type QuizDifficulty = "easy" | "medium" | "hard";
export type WidgetWidth = "normal" | "wide";
export type WidgetStatus = "idle" | "loading" | "success" | "error";
export type ThemePreset = "minimal" | "card";

export interface CompletionOptions {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    responseFormat?: ResponseFormat;
}

export interface AIProvider {
    complete(prompt: string, options?: CompletionOptions): Promise<string>;
    stream?(
        prompt: string,
        onChunk: (chunk: string) => void,
        options?: CompletionOptions,
    ): Promise<void>;
}

export interface ProviderConfig {
    type: ProviderType;
    apiKey?: string;
    baseURL: string;
    model: string;
}

export interface WidgetConfig {
    id: WidgetId;
    title: string;
    enabled: boolean;
    order: number;
    prompt: string;
    width?: WidgetWidth;
}

export interface DailyNoteConfig {
    folder: string;
    dateFormat: string;
    autoOpenOnStartup: boolean;
    template: string;
}

export interface CacheConfig {
    enabled: boolean;
    ttlHours: number;
}

export interface UIConfig {
    themePreset: ThemePreset;
}

export interface PluginSettings {
    provider: ProviderConfig;
    widgets: WidgetConfig[];
    dailyNote: DailyNoteConfig;
    cache: CacheConfig;
    ui: UIConfig;
}

export interface DashboardError {
    message: string;
    retryable?: boolean;
    rawText?: string;
}

export interface DashboardWidgetData {
    id: WidgetId;
    title: string;
    status: WidgetStatus;
    width?: WidgetWidth;
    data?: TaskWidgetData | NewsWidgetData | QuizWidgetData;
    error?: DashboardError;
}

export interface DashboardData {
    date: string;
    generatedAt: string;
    widgets: DashboardWidgetData[];
}

export interface TaskItem {
    text: string;
    priority: WidgetPriority;
    fromYesterday: boolean;
    completed?: boolean;
    sourcePath?: string;
    sourceLine?: number;
}

export interface TaskWidgetData {
    items: TaskItem[];
    summary: string;
    completedCount?: number;
    totalCount?: number;
    fallbackText?: string;
    generatedAt?: string;
}

export interface NewsItem {
    title: string;
    source: string;
    summary: string;
    url: string;
    publishedAt?: string;
}

export interface NewsWidgetData {
    items: NewsItem[];
    fallbackText?: string;
    generatedAt?: string;
}

export interface QuizWidgetData {
    question: string;
    answer: string;
    difficulty: QuizDifficulty;
    hint?: string;
    category?: string;
    fallbackText?: string;
    generatedAt?: string;
}

export interface CachedContent<TValue = unknown> {
    key: string;
    date: string;
    widgetId: WidgetId;
    value: TValue;
    createdAt: string;
    expiresAt?: string;
    providerType?: ProviderType;
    model?: string;
}
