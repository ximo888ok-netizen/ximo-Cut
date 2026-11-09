import type { Asset, DraftMeta, PlanShot, RenderSettings } from "../data";
import { isTauriRuntime } from "./desktop";
import type { ProjectState } from "./editorStore";
import type { AudioAnalysisResult } from "./audioAnalysis";

const WEB_PREFIX = "ximo-cut.draft.";
const FILE_FORMAT = "ximo-cut-project";
// 兼容改名前的草稿文件
const LEGACY_FILE_FORMAT = "opencut-project";
const FILE_VERSION = 1;

export interface DraftRecord {
  meta: DraftMeta;
  contents: string;
}

let draftsDirPromise: Promise<string> | null = null;

export function newDraftId(): string {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyDraftMeta(id: string, name = "未命名草稿"): DraftMeta {
  const now = new Date().toISOString();
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    duration: 0,
    clipCount: 0,
    assetCount: 0,
    tone: "blank",
  };
}

export function buildDraftMeta(options: {
  id: string;
  name: string;
  createdAt: string;
  project: ProjectState;
  assets: Asset[];
}): DraftMeta {
  const { id, name, createdAt, project, assets } = options;
  const clips = project.tracks.flatMap((track) => track.clips);
  const end = clips.reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0);
  const { cover, tone } = deriveDraftCover(project, assets);
  return {
    id,
    name,
    createdAt,
    updatedAt: new Date().toISOString(),
    duration: Number(end.toFixed(3)),
    clipCount: clips.length,
    assetCount: assets.length,
    cover,
    tone,
  };
}

export function deriveDraftCover(
  project: ProjectState,
  assets: Asset[],
): { cover?: string; tone: string } {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const clips = project.tracks
    .filter((track) => track.kind === "video" && !track.hidden)
    .flatMap((track) => track.clips)
    .filter((clip) => clip.kind === "video" && clip.assetId)
    .sort((a, b) => a.start - b.start);
  for (const clip of clips) {
    const asset = clip.assetId ? assetMap.get(clip.assetId) : undefined;
    if (asset?.thumbnail && !asset.thumbnail.startsWith("blob:")) {
      return { cover: asset.thumbnail, tone: asset.tone };
    }
  }
  return { tone: clips[0]?.tone ?? "blank" };
}

export function buildDraftContents(options: {
  meta: DraftMeta;
  project: ProjectState;
  assets: Asset[];
  renderSettings: RenderSettings;
  planShots: PlanShot[];
  audioAnalyses?: AudioAnalysisResult[];
}): string {
  return JSON.stringify(
    {
      format: FILE_FORMAT,
      version: FILE_VERSION,
      saved_at: new Date().toISOString(),
      draft: options.meta,
      project: options.project,
      assets: options.assets.map((asset) => ({ ...asset, url: undefined })),
      render_settings: options.renderSettings,
      plan_shots: options.planShots,
      audio_analyses: options.audioAnalyses ?? [],
    },
    null,
    2,
  );
}

export async function listDrafts(): Promise<DraftMeta[]> {
  if (!isTauriRuntime) {
    return listWebDrafts();
  }
  try {
    const [{ invoke }, dir] = await Promise.all([
      import("@tauri-apps/api/core"),
      draftsDirectory(),
    ]);
    const files = await invoke<Array<{ name: string; size: number; modified: number }>>(
      "list_draft_files",
    );
    const drafts = await Promise.all(
      files.map(async (file) => {
        try {
          const contents = await invoke<string>("read_text_file", {
            path: `${dir}\\${file.name}`,
          });
          return parseDraftMeta(contents, file.name, file.modified);
        } catch {
          return null;
        }
      }),
    );
    return drafts
      .filter((draft): draft is DraftMeta => draft !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function readDraft(id: string): Promise<DraftRecord | null> {
  const contents = await readDraftContents(id);
  if (!contents) {
    return null;
  }
  const meta = parseDraftMeta(contents, `${id}.json`, Date.now());
  if (!meta) {
    return null;
  }
  return { meta, contents };
}

export async function saveDraft(meta: DraftMeta, contents: string): Promise<DraftMeta> {
  const next: DraftMeta = { ...meta, updatedAt: new Date().toISOString() };
  const payload = withDraftMeta(contents, next);
  if (!isTauriRuntime) {
    window.localStorage.setItem(`${WEB_PREFIX}${meta.id}`, payload);
    return next;
  }
  const [{ invoke }, dir] = await Promise.all([
    import("@tauri-apps/api/core"),
    draftsDirectory(),
  ]);
  await invoke("write_text_file", {
    path: `${dir}\\${meta.id}.json`,
    contents: payload,
  });
  return next;
}

export async function deleteDraft(id: string): Promise<void> {
  if (!isTauriRuntime) {
    window.localStorage.removeItem(`${WEB_PREFIX}${id}`);
    return;
  }
  const [{ invoke }, dir] = await Promise.all([
    import("@tauri-apps/api/core"),
    draftsDirectory(),
  ]);
  await invoke("delete_draft_file", { path: `${dir}\\${id}.json` });
}

export async function renameDraft(id: string, name: string): Promise<DraftMeta | null> {
  const record = await readDraft(id);
  if (!record) {
    return null;
  }
  const trimmed = name.trim() || "未命名草稿";
  const meta: DraftMeta = { ...record.meta, name: trimmed };
  const data = JSON.parse(record.contents) as { project?: ProjectState };
  if (data.project) {
    data.project.name = trimmed;
  }
  return saveDraft(meta, JSON.stringify(data));
}

export async function duplicateDraft(id: string): Promise<DraftMeta | null> {
  const record = await readDraft(id);
  if (!record) {
    return null;
  }
  const nextId = newDraftId();
  const data = JSON.parse(record.contents) as { project?: ProjectState };
  const name = `${record.meta.name} 副本`;
  if (data.project) {
    data.project.name = name;
  }
  const meta: DraftMeta = {
    ...record.meta,
    id: nextId,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return saveDraft(meta, JSON.stringify({ ...data, draft: meta }));
}

async function readDraftContents(id: string): Promise<string | null> {
  if (!isTauriRuntime) {
    return window.localStorage.getItem(`${WEB_PREFIX}${id}`);
  }
  try {
    const [{ invoke }, dir] = await Promise.all([
      import("@tauri-apps/api/core"),
      draftsDirectory(),
    ]);
    return await invoke<string>("read_text_file", { path: `${dir}\\${id}.json` });
  } catch {
    return null;
  }
}

function listWebDrafts(): DraftMeta[] {
  const drafts: DraftMeta[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(WEB_PREFIX)) {
      continue;
    }
    const contents = window.localStorage.getItem(key);
    if (!contents) {
      continue;
    }
    const meta = parseDraftMeta(contents, key, Date.now());
    if (meta) {
      drafts.push(meta);
    }
  }
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function parseDraftMeta(contents: string, fileName: string, fallbackTime: number): DraftMeta | null {
  try {
    const data = JSON.parse(contents) as {
      format?: string;
      draft?: DraftMeta;
      project?: ProjectState;
    };
    if (data.format !== FILE_FORMAT && data.format !== LEGACY_FILE_FORMAT) {
      return null;
    }
    if (!data.project) {
      return null;
    }
    const id = fileName.replace(/^(?:opencut|ximo-cut)\.draft\./, "").replace(/\.json$/, "");
    const fallback = new Date(fallbackTime).toISOString();
    if (data.draft) {
      return {
        ...emptyDraftMeta(data.draft.id || id, data.draft.name || data.project.name),
        ...data.draft,
        id: data.draft.id || id,
      };
    }
    const clips = data.project.tracks.flatMap((track) => track.clips);
    const end = clips.reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0);
    return {
      ...emptyDraftMeta(id, data.project.name),
      updatedAt: fallback,
      createdAt: fallback,
      duration: Number(end.toFixed(3)),
      clipCount: clips.length,
    };
  } catch {
    return null;
  }
}

function withDraftMeta(contents: string, meta: DraftMeta): string {
  try {
    const data = JSON.parse(contents) as Record<string, unknown>;
    return JSON.stringify({ ...data, draft: meta, saved_at: new Date().toISOString() }, null, 2);
  } catch {
    return contents;
  }
}

async function draftsDirectory(): Promise<string> {
  if (!draftsDirPromise) {
    draftsDirPromise = import("@tauri-apps/api/core").then(({ invoke }) =>
      invoke<string>("drafts_directory"),
    );
  }
  return draftsDirPromise;
}

export function formatDraftTime(value: string): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    return "";
  }
  const now = Date.now();
  const diff = Math.max(0, now - time);
  if (diff < 60_000) {
    return "刚刚";
  }
  if (diff < 3_600_000) {
    return `${Math.floor(diff / 60_000)} 分钟前`;
  }
  const date = new Date(time);
  const sameDay = date.toDateString() === new Date(now).toDateString();
  if (sameDay) {
    return `今天 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  const yesterday = new Date(now - 86_400_000);
  if (date.toDateString() === yesterday.toDateString()) {
    return "昨天";
  }
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

export function formatDraftDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "00:00";
  }
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
