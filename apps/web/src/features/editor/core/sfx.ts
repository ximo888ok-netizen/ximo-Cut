import type { Asset } from "../data";
import { isTauriRuntime, localFileUrl } from "./desktop";

export interface BuiltinSfx {
  id: string;
  name: string;
  category: string;
  duration: number;
  path: string;
}

export async function listBuiltinSfx(): Promise<BuiltinSfx[]> {
  if (!isTauriRuntime) {
    return [];
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<BuiltinSfx[]>("sfx_library");
  } catch {
    return [];
  }
}

export async function sfxToAsset(sfx: BuiltinSfx): Promise<Asset> {
  return {
    id: `sfx-${sfx.id}`,
    name: sfx.name,
    meta: `${sfx.duration.toFixed(2)}s · ${sfx.category} · 内置音效`,
    duration: `00:${String(Math.max(1, Math.round(sfx.duration))).padStart(2, "0")}`,
    kind: "audio",
    tone: "sfx",
    tag: "内置音效",
    url: await localFileUrl(sfx.path),
    path: sfx.path,
  };
}
