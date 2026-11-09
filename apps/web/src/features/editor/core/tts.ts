import type { Asset } from "../data";
import { isTauriRuntime, localFileUrl } from "./desktop";

export interface SpeechResult {
  path: string;
  duration: number;
}

export async function synthesizeSpeech(text: string, rate = 0): Promise<SpeechResult> {
  if (!isTauriRuntime) {
    throw new Error("系统配音仅在桌面版可用");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<SpeechResult>("synthesize_speech", { text, rate });
}

export async function speechToAsset(text: string, result: SpeechResult): Promise<Asset> {
  const clipped = text.trim().slice(0, 18);
  return {
    id: `tts-${Date.now().toString(36)}`,
    name: `配音 · ${clipped}`,
    meta: `${result.duration.toFixed(1)}s · 系统配音`,
    duration: `00:${String(Math.max(1, Math.round(result.duration))).padStart(2, "0")}`,
    kind: "audio",
    tone: "voice",
    tag: "系统配音",
    url: await localFileUrl(result.path),
    path: result.path,
  };
}
