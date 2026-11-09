import { isTauriRuntime } from "./desktop";
import t2s from "./t2s.json";

export interface AsrCue {
  start: number;
  end: number;
  text: string;
}

export interface AsrStatus {
  available: boolean;
  binary?: string | null;
  model?: string | null;
  reason?: string | null;
}

const MAX_LINE_CHARS = 20;

export async function getAsrStatus(): Promise<AsrStatus> {
  if (!isTauriRuntime) {
    return { available: false, reason: "本地语音模型仅在桌面版可用" };
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<AsrStatus>("asr_status");
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export async function transcribeAsset(
  path: string,
  language = "zh",
): Promise<AsrCue[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke<{ segments: AsrCue[]; duration: number }>("transcribe_audio", {
    input: path,
    language,
  });
  return normalizeCues(result.segments);
}

export async function transcribeSegments(
  segments: Array<{ path: string; start: number; duration: number }>,
  language = "zh",
): Promise<AsrCue[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke<{ segments: AsrCue[]; duration: number }>("transcribe_segments", {
    segments,
    language,
  });
  return normalizeCues(result.segments);
}

export function normalizeCues(segments: AsrCue[]): AsrCue[] {
  const cues: AsrCue[] = [];
  for (const segment of segments) {
    const text = toSimplified(segment.text).replace(/\s+/g, " ").trim();
    if (!text || !Number.isFinite(segment.start) || !Number.isFinite(segment.end)) {
      continue;
    }
    const start = Math.max(0, segment.start);
    const end = Math.max(start + 0.3, segment.end);
    const parts = splitCaptionText(text);
    const total = end - start;
    let cursor = start;
    for (const part of parts) {
      const share = parts.length === 1 ? 1 : part.length / text.length;
      const duration = Math.max(0.4, total * share);
      const partEnd = Math.min(end, cursor + duration);
      cues.push({
        start: round(cursor),
        end: round(Math.max(cursor + 0.3, partEnd)),
        text: part,
      });
      cursor = partEnd;
    }
  }
  return cues;
}

function splitCaptionText(text: string): string[] {
  if (text.length <= MAX_LINE_CHARS) {
    return [text];
  }
  const parts: string[] = [];
  let current = "";
  for (const character of text) {
    current += character;
    const isBreak = /[，。！？；：,.!?;:]/.test(character);
    if (current.length >= MAX_LINE_CHARS || (isBreak && current.length >= 8)) {
      parts.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts.filter(Boolean);
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

export function toSimplified(text: string): string {
  const map = t2s as Record<string, string>;
  let output = "";
  for (const character of text) {
    output += map[character] ?? character;
  }
  return output;
}
