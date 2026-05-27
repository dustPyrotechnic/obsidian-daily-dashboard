import type { CacheConfig, CachedContent, ProviderType, WidgetId } from "../types";

export interface CacheStore {
    load(): Promise<Record<string, CachedContent> | null>;
    save(map: Record<string, CachedContent>): Promise<void>;
}

export interface ContentCacheOptions {
    store: CacheStore;
    config: CacheConfig;
}

export interface CacheGetOptions {
    date?: string;
    now?: Date;
}

export interface CacheSetOptions {
    date?: string;
    now?: Date;
    providerType?: ProviderType;
    model?: string;
}

export interface CacheClearOptions {
    widgetId?: WidgetId;
    date?: string;
}

const MS_PER_HOUR = 60 * 60 * 1000;

export class ContentCache {
    private store: CacheStore;
    private config: CacheConfig;
    private writeQueue: Promise<void> = Promise.resolve();

    constructor(opts: ContentCacheOptions) {
        this.store = opts.store;
        this.config = opts.config;
    }

    static makeKey(date: string, widgetId: WidgetId): string {
        return `${date}_${widgetId}`;
    }

    static todayString(now: Date = new Date()): string {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    updateConfig(config: CacheConfig): void {
        this.config = config;
    }

    async get<T>(widgetId: WidgetId, opts: CacheGetOptions = {}): Promise<T | null> {
        if (!this.config.enabled) {
            return null;
        }

        const date = opts.date ?? ContentCache.todayString(opts.now);
        const key = ContentCache.makeKey(date, widgetId);

        const map = await this.store.load();
        if (!map) {
            return null;
        }

        const entry = map[key];
        if (!entry || entry.key !== key) {
            return null;
        }

        if (entry.expiresAt) {
            const expiresMs = Date.parse(entry.expiresAt);
            const nowMs = (opts.now ?? new Date()).getTime();
            /// Date.parse 失败返回 NaN，NaN < nowMs 为 false，等同于不过期，故显式判断
            if (!Number.isNaN(expiresMs) && expiresMs < nowMs) {
                return null;
            }
        }

        return entry.value as T;
    }

    async set<T>(widgetId: WidgetId, value: T, opts: CacheSetOptions = {}): Promise<void> {
        if (!this.config.enabled) {
            return;
        }

        const now = opts.now ?? new Date();
        const date = opts.date ?? ContentCache.todayString(now);
        const key = ContentCache.makeKey(date, widgetId);
        const createdAt = now.toISOString();

        const entry: CachedContent<T> = {
            key,
            date,
            widgetId,
            value,
            createdAt,
        };

        if (this.config.ttlHours > 0) {
            const expiresMs = now.getTime() + this.config.ttlHours * MS_PER_HOUR;
            entry.expiresAt = new Date(expiresMs).toISOString();
        }

        if (opts.providerType) {
            entry.providerType = opts.providerType;
        }
        if (opts.model) {
            entry.model = opts.model;
        }

        await this.enqueueWrite(async () => {
            const existing = (await this.store.load()) ?? {};
            /// 合并写入，避免覆盖其他 widget 的缓存
            const next: Record<string, CachedContent> = {
                ...existing,
                [key]: entry as CachedContent,
            };
            await this.store.save(next);
        });
    }

    async clear(opts: CacheClearOptions = {}): Promise<void> {
        const { widgetId, date } = opts;

        if (!widgetId && !date) {
            await this.enqueueWrite(async () => {
                await this.store.save({});
            });
            return;
        }

        await this.enqueueWrite(async () => {
            const existing = await this.store.load();
            if (!existing) {
                return;
            }

            const next: Record<string, CachedContent> = {};
            for (const [k, entry] of Object.entries(existing)) {
                if (this.shouldKeep(entry, widgetId, date)) {
                    next[k] = entry;
                }
            }
            await this.store.save(next);
        });
    }

    private enqueueWrite(operation: () => Promise<void>): Promise<void> {
        const queuedOperation = this.writeQueue.then(operation, operation);
        this.writeQueue = queuedOperation.catch(() => undefined);
        return queuedOperation;
    }

    private shouldKeep(
        entry: CachedContent,
        widgetId: WidgetId | undefined,
        date: string | undefined,
    ): boolean {
        const matchesWidget = widgetId === undefined || entry.widgetId === widgetId;
        const matchesDate = date === undefined || entry.date === date;
        /// 同时命中筛选条件 → 删除（不保留）
        return !(matchesWidget && matchesDate);
    }
}
