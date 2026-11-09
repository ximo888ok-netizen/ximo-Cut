import type { Asset, PlanShot, RenderSettings } from "../data";
import type { ProjectState } from "./editorStore";
import type { RenderRequest } from "./renderRequest";
import type { AudioAnalysisResult } from "./audioAnalysis";

export const isTauriRuntime =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface MediaFileInfo {
  path: string;
  name: string;
  size: number;
}

export interface ProjectFile {
  format: "ximo-cut-project";
  version: 1;
  saved_at: string;
  project: ProjectState;
  assets: Asset[];
  render_settings: RenderSettings;
  plan_shots: PlanShot[];
  audio_analyses?: AudioAnalysisResult[];
}

const mediaExtensions = [
  "mp4",
  "mov",
  "mkv",
  "webm",
  "avi",
  "wav",
  "mp3",
  "m4a",
  "aac",
  "flac",
  "ogg",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "bmp",
  "gif",
];

export async function pickMediaFiles(): Promise<MediaFileInfo[]> {
  const [{ open }, { invoke }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/api/core"),
  ]);
  const selection = await open({
    multiple: true,
    filters: [{ name: "媒体文件", extensions: mediaExtensions }],
  });
  const paths = Array.isArray(selection) ? selection : selection ? [selection] : [];
  return Promise.all(
    paths.map(async (path) => {
      const info = await invoke<{ name: string; size: number }>("file_info", { path });
      return { path, name: info.name, size: info.size };
    }),
  );
}

export async function mediaInfoFromPaths(paths: string[]): Promise<MediaFileInfo[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  return Promise.all(
    paths.map(async (path) => {
      try {
        const info = await invoke<{ name: string; size: number }>("file_info", { path });
        return { path, name: info.name, size: info.size };
      } catch {
        return { path, name: path.split(/[\\/]/).pop() ?? path, size: 0 };
      }
    }),
  );
}

export async function pickReferenceVideo(): Promise<MediaFileInfo | null> {
  const [{ open }, { invoke }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/api/core"),
  ]);
  const selected = await open({
    multiple: false,
    filters: [
      { name: "参考视频", extensions: ["mp4", "mov", "mkv", "webm", "avi", "m4v"] },
    ],
  });
  if (!selected || Array.isArray(selected)) {
    return null;
  }
  const info = await invoke<{ name: string; size: number }>("file_info", { path: selected });
  return { path: selected, name: info.name, size: info.size };
}

export async function saveSrtDialog(
  defaultName: string,
  contents: string,
): Promise<string | null> {
  const [{ save }, { invoke }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/api/core"),
  ]);
  const selected = await save({
    defaultPath: defaultName,
    filters: [{ name: "字幕文件", extensions: ["srt"] }],
  });
  if (!selected) {
    return null;
  }
  await invoke("write_text_file", { path: selected, contents });
  return selected;
}

export async function localFileUrl(path: string): Promise<string> {
  const { convertFileSrc } = await import("@tauri-apps/api/core");
  return convertFileSrc(path);
}

export async function readLocalFile(
  path: string,
  name: string,
  mimeType?: string,
): Promise<File> {
  const response = await fetch(await localFileUrl(path));
  if (!response.ok) {
    throw new Error(`无法读取本地文件：${name}`);
  }
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || mimeType || "" });
}

export async function saveProjectDialog(
  defaultName: string,
  contents: string,
): Promise<string | null> {
  const [{ save }, { invoke }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/api/core"),
  ]);
  const selected = await save({
    defaultPath: defaultName,
    filters: [{ name: "ximo-Cut 工程", extensions: ["json", "ocproj"] }],
  });
  if (!selected) {
    return null;
  }
  await invoke("write_text_file", { path: selected, contents });
  return selected;
}

export async function writeProjectFile(path: string, contents: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("write_text_file", { path, contents });
}

export async function saveVideoDialog(
  defaultName: string,
  format: string,
): Promise<string | null> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const extension = format === "webm" ? "webm" : "mp4";
  const selected = await save({
    defaultPath: defaultName,
    filters: [{ name: "视频文件", extensions: [extension] }],
  });
  return selected ?? null;
}

export async function renderVideoFile(
  request: RenderRequest,
  output: string,
): Promise<string> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("render_video", { request, output });
}

export async function openProjectDialog(): Promise<{
  path: string;
  contents: string;
} | null> {
  const [{ open }, { invoke }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/api/core"),
  ]);
  const selected = await open({
    multiple: false,
    filters: [{ name: "ximo-Cut 工程", extensions: ["json", "ocproj"] }],
  });
  if (!selected || Array.isArray(selected)) {
    return null;
  }
  const contents = await invoke<string>("read_text_file", { path: selected });
  return { path: selected, contents };
}

export function serializeProjectFile(
  project: ProjectState,
  assets: Asset[],
  renderSettings: RenderSettings,
  planShots: PlanShot[],
  audioAnalyses: AudioAnalysisResult[] = [],
): string {
  const payload: ProjectFile = {
    format: "ximo-cut-project",
    version: 1,
    saved_at: new Date().toISOString(),
    project,
    assets: assets.map((asset) => ({ ...asset, url: undefined })),
    render_settings: renderSettings,
    plan_shots: planShots,
    audio_analyses: audioAnalyses,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseProjectFile(contents: string): ProjectFile {
  const data = JSON.parse(contents) as Partial<ProjectFile>;
  const format = String((data as { format?: unknown }).format ?? "");
  // 兼容改名前的工程文件
  if (
    (format !== "ximo-cut-project" && format !== "opencut-project") ||
    !data.project ||
    !Array.isArray(data.assets)
  ) {
    throw new Error("不是有效的 ximo-Cut 工程文件");
  }
  return {
    format: "ximo-cut-project",
    version: 1,
    saved_at: data.saved_at ?? new Date().toISOString(),
    project: data.project,
    assets: data.assets,
    render_settings: data.render_settings ?? {
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: "12 Mbps",
      format: "mp4",
      burnSubtitles: true,
      rangeStart: 0,
      rangeEnd: data.project.duration,
    },
    plan_shots: Array.isArray(data.plan_shots) ? data.plan_shots : [],
    audio_analyses: Array.isArray(data.audio_analyses) ? data.audio_analyses : [],
  };
}
