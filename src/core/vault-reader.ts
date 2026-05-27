import { App, TFile, normalizePath, moment } from "obsidian";

export interface NoteContent {
    file: TFile;
    path: string;
    text: string;
}

/// 按相对路径读取笔记。文件不存在或不是 TFile 时返回 null（不抛），
/// 让调用方按业务需求决定降级行为。
export async function readNoteByPath(
    app: App,
    path: string,
): Promise<NoteContent | null> {
    const normalized = normalizePath(path);
    const file = app.vault.getAbstractFileByPath(normalized);
    if (!(file instanceof TFile)) {
        return null;
    }
    /// cachedRead 比 read 更快，且在渲染路径上足够新鲜
    const text = await app.vault.cachedRead(file);
    return { file, path: file.path, text };
}

/// 按日期 + 文件名格式 + 文件夹定位每日笔记。
/// 拼接规则：`${folder}/${moment(date).format(dateFormat)}.md`，folder 为空则不加前缀。
export async function readNoteByDate(
    app: App,
    opts: {
        folder: string;
        dateFormat: string;
        date: Date;
    },
): Promise<NoteContent | null> {
    const fileName = moment(opts.date).format(opts.dateFormat);
    const folder = opts.folder?.trim() ?? "";
    const joined = folder.length > 0 ? `${folder}/${fileName}.md` : `${fileName}.md`;
    return readNoteByPath(app, joined);
}

/// 读取昨天的每日笔记。today 缺省取当前时间，便于测试注入。
export async function readYesterdayNote(
    app: App,
    opts: {
        folder: string;
        dateFormat: string;
        today?: Date;
    },
): Promise<NoteContent | null> {
    const base = opts.today ?? new Date();
    const yesterday = moment(base).subtract(1, "day").toDate();
    return readNoteByDate(app, {
        folder: opts.folder,
        dateFormat: opts.dateFormat,
        date: yesterday,
    });
}
