import { isTauriRuntime } from "./desktop";

const WEB_PREFIX = "ximo-cut.script.";
const FILE_FORMAT = "ximo-cut-script";
// 兼容改名前的脚本文件
const LEGACY_FILE_FORMAT = "opencut-script";
const FILE_VERSION = 1;

export interface ScriptShot {
  id: string;
  duration: number;
  shotSize: string;
  description: string;
  dialogue: string;
  transition: string;
}

export interface ScriptDoc {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  source: "manual" | "replica";
  referenceName?: string;
  referenceDuration?: number;
  coverPath?: string;
  shots: ScriptShot[];
}

let scriptsDirPromise: Promise<string> | null = null;

export const SHOT_SIZES = ["远景", "全景", "中景", "近景", "特写", "空镜"];
export const SCRIPT_TRANSITIONS = ["硬切", "淡入", "淡出"] as const;

export function newScriptId(): string {
  return `script-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyShot(index = 0): ScriptShot {
  return {
    id: `shot-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 5)}`,
    duration: 3,
    shotSize: "中景",
    description: "",
    dialogue: "",
    transition: "硬切",
  };
}

export function createScript(title = "未命名脚本"): ScriptDoc {
  const now = new Date().toISOString();
  return {
    id: newScriptId(),
    title,
    createdAt: now,
    updatedAt: now,
    source: "manual",
    shots: [emptyShot(0)],
  };
}

export function scriptDuration(doc: ScriptDoc): number {
  return Number(
    doc.shots.reduce((sum, shot) => sum + Math.max(0, shot.duration), 0).toFixed(3),
  );
}

export function shotTimeline(doc: ScriptDoc): Array<{ shot: ScriptShot; start: number }> {
  let cursor = 0;
  return doc.shots.map((shot) => {
    const start = cursor;
    cursor += Math.max(0, shot.duration);
    return { shot, start: Number(start.toFixed(3)) };
  });
}

export function normalizeScriptDoc(input: unknown, fallbackId: string): ScriptDoc | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const data = input as Partial<ScriptDoc> & { format?: string };
  if (
    data.format &&
    data.format !== FILE_FORMAT &&
    data.format !== LEGACY_FILE_FORMAT
  ) {
    return null;
  }
  if (!Array.isArray(data.shots) || data.shots.length === 0) {
    return null;
  }
  const now = new Date().toISOString();
  const shots: ScriptShot[] = data.shots
    .filter((shot): shot is ScriptShot => Boolean(shot) && typeof shot === "object")
    .filter((shot) => Number.isFinite(Number(shot.duration)) && Number(shot.duration) > 0)
    .map((shot, index) => ({
      id: typeof shot.id === "string" && shot.id ? shot.id : `shot-${fallbackId}-${index}`,
      duration: clampDuration(Number(shot.duration)),
      shotSize: typeof shot.shotSize === "string" && shot.shotSize ? shot.shotSize : "中景",
      description: typeof shot.description === "string" ? shot.description : "",
      dialogue: typeof shot.dialogue === "string" ? shot.dialogue : "",
      transition: SCRIPT_TRANSITIONS.includes(
        shot.transition as (typeof SCRIPT_TRANSITIONS)[number],
      )
        ? shot.transition
        : "硬切",
    }));
  if (shots.length === 0) {
    return null;
  }
  return {
    id: typeof data.id === "string" && data.id ? data.id : fallbackId,
    title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : "未命名脚本",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : now,
    source: data.source === "replica" ? "replica" : "manual",
    referenceName: typeof data.referenceName === "string" ? data.referenceName : undefined,
    referenceDuration:
      typeof data.referenceDuration === "number" && Number.isFinite(data.referenceDuration)
        ? data.referenceDuration
        : undefined,
    coverPath: typeof data.coverPath === "string" ? data.coverPath : undefined,
    shots,
  };
}

export function scriptToSrt(doc: ScriptDoc): string {
  let index = 0;
  return shotTimeline(doc)
    .filter(({ shot }) => shot.dialogue.trim().length > 0)
    .map(({ shot, start }) => {
      index += 1;
      return `${index}\n${srtTime(start)} --> ${srtTime(start + shot.duration)}\n${shot.dialogue.trim()}\n`;
    })
    .join("\n");
}

export async function listScripts(): Promise<ScriptDoc[]> {
  if (!isTauriRuntime) {
    return listWebScripts();
  }
  try {
    const [{ invoke }, dir] = await Promise.all([
      import("@tauri-apps/api/core"),
      scriptsDirectory(),
    ]);
    const files = await invoke<Array<{ name: string }>>("list_script_files");
    const docs = await Promise.all(
      files.map(async (file) => {
        try {
          const contents = await invoke<string>("read_text_file", {
            path: `${dir}\\${file.name}`,
          });
          return parseScript(contents, file.name.replace(/\.json$/i, ""));
        } catch {
          return null;
        }
      }),
    );
    return docs
      .filter((doc): doc is ScriptDoc => doc !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function readScript(id: string): Promise<ScriptDoc | null> {
  if (!isTauriRuntime) {
    return parseScript(window.localStorage.getItem(`${WEB_PREFIX}${id}`) ?? "", id);
  }
  try {
    const [{ invoke }, dir] = await Promise.all([
      import("@tauri-apps/api/core"),
      scriptsDirectory(),
    ]);
    const contents = await invoke<string>("read_text_file", { path: `${dir}\\${id}.json` });
    return parseScript(contents, id);
  } catch {
    return null;
  }
}

export async function saveScript(doc: ScriptDoc): Promise<ScriptDoc> {
  const next: ScriptDoc = { ...doc, updatedAt: new Date().toISOString() };
  const payload = JSON.stringify(
    { format: FILE_FORMAT, version: FILE_VERSION, ...next },
    null,
    2,
  );
  if (!isTauriRuntime) {
    window.localStorage.setItem(`${WEB_PREFIX}${doc.id}`, payload);
    return next;
  }
  const [{ invoke }, dir] = await Promise.all([
    import("@tauri-apps/api/core"),
    scriptsDirectory(),
  ]);
  await invoke("write_text_file", { path: `${dir}\\${doc.id}.json`, contents: payload });
  return next;
}

export async function deleteScript(id: string): Promise<void> {
  if (!isTauriRuntime) {
    window.localStorage.removeItem(`${WEB_PREFIX}${id}`);
    return;
  }
  const [{ invoke }, dir] = await Promise.all([
    import("@tauri-apps/api/core"),
    scriptsDirectory(),
  ]);
  await invoke("delete_script_file", { path: `${dir}\\${id}.json` });
}

export async function duplicateScript(doc: ScriptDoc): Promise<ScriptDoc> {
  const now = new Date().toISOString();
  return saveScript({
    ...doc,
    id: newScriptId(),
    title: `${doc.title} 副本`,
    createdAt: now,
    updatedAt: now,
    shots: doc.shots.map((shot, index) => ({ ...emptyShot(index), ...shot, id: emptyShot(index).id })),
  });
}

function parseScript(contents: string, id: string): ScriptDoc | null {
  if (!contents) {
    return null;
  }
  try {
    return normalizeScriptDoc(JSON.parse(contents), id);
  } catch {
    return null;
  }
}

function listWebScripts(): ScriptDoc[] {
  const docs: ScriptDoc[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(WEB_PREFIX)) {
      continue;
    }
    const doc = parseScript(
      window.localStorage.getItem(key) ?? "",
      key.slice(WEB_PREFIX.length),
    );
    if (doc) {
      docs.push(doc);
    }
  }
  return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function scriptsDirectory(): Promise<string> {
  if (!scriptsDirPromise) {
    scriptsDirPromise = import("@tauri-apps/api/core").then(({ invoke }) =>
      invoke<string>("scripts_directory"),
    );
  }
  return scriptsDirPromise;
}

function clampDuration(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 3;
  }
  return Number(Math.min(60, Math.max(0.5, value)).toFixed(3));
}

function srtTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const millis = Math.round((safe - Math.floor(safe)) * 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${String(millis).padStart(3, "0")}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
