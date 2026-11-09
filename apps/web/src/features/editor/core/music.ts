import type { Asset } from "../data";
import { isTauriRuntime, localFileUrl } from "./desktop";

export interface BuiltinMusic {
  id: string;
  name: string;
  bpm: number;
  mood: string;
  duration: number;
  path: string;
}

export async function listBuiltinMusic(): Promise<BuiltinMusic[]> {
  if (!isTauriRuntime) {
    return [];
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<BuiltinMusic[]>("music_library");
  } catch {
    return [];
  }
}

export async function musicToAsset(track: BuiltinMusic): Promise<Asset> {
  return {
    id: `music-${track.id}`,
    name: track.name,
    meta: `${formatMusicDuration(track.duration)} · ${track.bpm} BPM · 内置免版权`,
    duration: formatMusicDuration(track.duration),
    kind: "audio",
    tone: "music",
    tag: "内置音乐",
    url: await localFileUrl(track.path),
    path: track.path,
  };
}

export function formatMusicDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
