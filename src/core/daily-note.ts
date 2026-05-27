import { App, TFile, TFolder, normalizePath, moment } from "obsidian";
import type { DailyNoteConfig } from "../types";

/// 根据 DailyNoteConfig 计算今日笔记的 vault 相对路径。
/// 当 folder 为空时直接返回 `${date}.md`，避免出现以 `/` 开头的非法路径。
export function resolveTodayNotePath(config: DailyNoteConfig, now?: Date): string {
    const date = moment(now ?? new Date()).format(config.dateFormat);
    const folder = (config.folder ?? "").trim();
    const raw = folder.length > 0 ? `${folder}/${date}.md` : `${date}.md`;
    return normalizePath(raw);
}

/// 确保今日笔记存在：不存在则按 config.template 创建，存在则原样返回。
/// 父级文件夹缺失时会逐级创建；若文件夹已存在则忽略对应错误。
export async function ensureTodayNote(
    app: App,
    config: DailyNoteConfig,
    now?: Date,
): Promise<TFile> {
    const path = resolveTodayNotePath(config, now);
    const existing = app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
        return existing;
    }

    await ensureParentFolder(app, path);

    return await app.vault.create(path, config.template ?? "");
}

/// 在 Obsidian 当前活动叶子打开今日笔记，必要时先创建。
export async function openTodayNote(
    app: App,
    config: DailyNoteConfig,
    now?: Date,
): Promise<void> {
    const file = await ensureTodayNote(app, config, now);
    await app.workspace.getLeaf(false).openFile(file);
}

/// 供 main.ts 在 onLayoutReady 中调用：autoOpenOnStartup 为 true 时打开今日笔记。
export async function autoOpenIfEnabled(app: App, config: DailyNoteConfig): Promise<void> {
    if (!config.autoOpenOnStartup) {
        return;
    }
    await openTodayNote(app, config);
}

async function ensureParentFolder(app: App, notePath: string): Promise<void> {
    const parentPath = getParentFolderPath(notePath);
    if (!parentPath) {
        return;
    }

    const parts = parentPath.split("/");
    let currentPath = "";
    for (const part of parts) {
        if (part.length === 0) {
            continue;
        }

        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const existing = app.vault.getAbstractFileByPath(currentPath);
        if (existing instanceof TFolder) {
            continue;
        }
        if (existing) {
            throw new Error(`Cannot create folder "${currentPath}" because a file already exists there.`);
        }

        try {
            await app.vault.createFolder(currentPath);
        } catch (err) {
            /// Obsidian 在文件夹已存在时会抛错，按"已存在"无害降级；
            /// 其他错误（如非法路径、权限问题）继续向上抛。
            if (!isFolderAlreadyExistsError(err)) {
                throw err;
            }
        }
    }
}

function getParentFolderPath(notePath: string): string {
    const normalizedPath = normalizePath(notePath);
    const lastSlashIndex = normalizedPath.lastIndexOf("/");
    if (lastSlashIndex <= 0) {
        return "";
    }
    return normalizedPath.slice(0, lastSlashIndex);
}

/// 通过错误消息判定是否为"文件夹已存在"这一无害错误。
function isFolderAlreadyExistsError(err: unknown): boolean {
    const message = err instanceof Error ? err.message : String(err);
    return /already exists/i.test(message);
}
