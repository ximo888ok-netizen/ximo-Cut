import { isTauriRuntime } from "./desktop";
import type { AsrCue } from "./asr";

export interface SilenceSpan {
  start: number;
  end: number;
}

export interface ShotQuality {
  start: number;
  end: number;
  blur: number;
  brightness: number;
  score: number;
}

export interface MaterialAnalysis {
  duration: number;
  scenes: number[];
  silences: SilenceSpan[];
  shots?: ShotQuality[];
}

export async function analyzeMaterial(
  path: string,
  options: { quality?: boolean } = {},
): Promise<MaterialAnalysis> {
  if (!isTauriRuntime) {
    throw new Error("素材分析仅在桌面版可用");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<MaterialAnalysis>("analyze_material", {
    input: path,
    quality: Boolean(options.quality),
  });
}

export interface QuickCutMaterial {
  assetId: string;
  duration: number;
  scenes: number[];
  silences: SilenceSpan[];
  still?: boolean;
}

export interface QuickCutShot {
  assetId: string;
  sourceIn: number;
  duration: number;
  speech: boolean;
  score: number;
}

export interface QuickCutOptions {
  targetDuration: number;
  bpm?: number | null;
  minShot?: number;
  maxShot?: number;
  shotsPerAsset?: number;
}

const MIN_SHOT = 0.9;
const MAX_SHOT = 4.2;
const SHOTS_PER_ASSET = 3;
const SILENCE_PAD = 0.12;

/** 按镜头切换点切分素材，裁掉首尾停顿，再拆成不超过 maxShot 的选段 */
export function splitShots(
  material: QuickCutMaterial,
  options: QuickCutOptions = { targetDuration: 30 },
): Array<Omit<QuickCutShot, "score">> {
  const minShot = options.minShot ?? MIN_SHOT;
  const maxShot = options.maxShot ?? MAX_SHOT;
  const duration = Math.max(0, material.duration);
  if (duration <= 0.2) {
    return [];
  }
  if (material.still) {
    return [
      {
        assetId: material.assetId,
        sourceIn: 0,
        duration: Math.min(3, duration),
        speech: false,
      },
    ];
  }

  const cuts = [
    0,
    ...material.scenes.filter((time) => time > minShot && time < duration - minShot),
    duration,
  ].sort((a, b) => a - b);

  const shots: Array<Omit<QuickCutShot, "score">> = [];
  for (let index = 0; index < cuts.length - 1; index += 1) {
    const trimmed = trimEdges(cuts[index], cuts[index + 1], material.silences);
    if (!trimmed || trimmed.duration < minShot) {
      continue;
    }
    const pieces = Math.max(1, Math.ceil(trimmed.duration / maxShot));
    const piece = trimmed.duration / pieces;
    for (let part = 0; part < pieces; part += 1) {
      const start = trimmed.start + part * piece;
      const end = start + piece;
      shots.push({
        assetId: material.assetId,
        sourceIn: round(start),
        duration: round(piece),
        speech: silentRatio(start, end, material.silences) < 0.55,
      });
    }
  }
  return shots;
}

/** 裁掉镜头首尾的静音，保留少量气口 */
export function trimEdges(
  start: number,
  end: number,
  silences: SilenceSpan[],
): { start: number; end: number; duration: number } | null {
  if (silentRatio(start, end, silences) > 0.9) {
    return null;
  }
  let nextStart = start;
  let nextEnd = end;
  for (const span of silences) {
    if (span.start <= start + 0.08 && span.end > nextStart && span.end < end - 0.05) {
      nextStart = Math.max(start, span.end - SILENCE_PAD);
    }
    if (span.end >= end - 0.08 && span.start < nextEnd && span.start > start + 0.05) {
      nextEnd = Math.min(end, span.start + SILENCE_PAD);
    }
  }
  if (nextEnd - nextStart < 0.3) {
    return null;
  }
  return { start: nextStart, end: nextEnd, duration: nextEnd - nextStart };
}

export function silentRatio(
  start: number,
  end: number,
  silences: SilenceSpan[],
): number {
  const total = Math.max(0.001, end - start);
  let silent = 0;
  for (const span of silences) {
    const overlap = Math.min(end, span.end) - Math.max(start, span.start);
    if (overlap > 0) {
      silent += overlap;
    }
  }
  return Math.min(1, silent / total);
}

/** 有说话的镜头优先，时长接近 2 秒的镜头优先 */
export function scoreShot(shot: { duration: number; speech: boolean }): number {
  const ideal = 2.2;
  const durationScore = 1 - Math.min(1, Math.abs(shot.duration - ideal) / ideal);
  const rhythmBonus = shot.duration >= 1.2 && shot.duration <= 3.2 ? 0.15 : 0;
  return round(durationScore + (shot.speech ? 0.45 : 0) + rhythmBonus);
}

/** 把选段时长向下对齐到整拍，保证剪点踩在鼓点上且不会超出素材 */
export function snapToBeat(duration: number, beat: number): number {
  if (!Number.isFinite(beat) || beat <= 0.05) {
    return round(duration);
  }
  const beats = Math.min(16, Math.max(1, Math.floor(duration / beat)));
  return round(beats * beat);
}

export function planQuickCut(
  materials: QuickCutMaterial[],
  options: QuickCutOptions,
): QuickCutShot[] {
  const shotsPerAsset = options.shotsPerAsset ?? SHOTS_PER_ASSET;
  const beat = options.bpm ? 60 / options.bpm : 0;
  const candidates: Array<QuickCutShot & { order: number }> = [];

  materials.forEach((material, order) => {
    const scored = splitShots(material, options)
      .map((shot) => ({ ...shot, score: scoreShot(shot), order }))
      .sort((a, b) => b.score - a.score);
    candidates.push(...scored.slice(0, shotsPerAsset));
  });
  if (candidates.length === 0) {
    return [];
  }

  const pool = [...candidates].sort((a, b) => b.score - a.score);
  const chosen: Array<QuickCutShot & { order: number }> = [];
  let total = 0;
  for (const shot of pool) {
    if (chosen.length >= 3 && total >= options.targetDuration) {
      break;
    }
    chosen.push(shot);
    total += beat ? snapToBeat(shot.duration, beat) : shot.duration;
  }

  while (chosen.length > 3 && total > options.targetDuration * 1.2) {
    const removed = chosen.pop();
    if (!removed) {
      break;
    }
    total -= beat ? snapToBeat(removed.duration, beat) : removed.duration;
  }

  return chosen
    .sort((a, b) => a.order - b.order || a.sourceIn - b.sourceIn)
    .map(({ order: _order, ...shot }) => ({
      ...shot,
      duration: beat ? snapToBeat(shot.duration, beat) : round(shot.duration),
    }));
}

export interface QuickCutWindow {
  /** 片段在时间线上的起点 */
  start: number;
  duration: number;
  /** 片段在拼接音轨里的起点 */
  sourceStart: number;
}

/** 把拼接音轨上的字幕时间映射回各片段时间线位置 */
export function mapCuesToTimeline(
  cues: AsrCue[],
  windows: QuickCutWindow[],
): AsrCue[] {
  const mapped: AsrCue[] = [];
  for (const cue of cues) {
    for (const window of windows) {
      const localStart = cue.start - window.sourceStart;
      if (localStart < -0.05 || localStart >= window.duration - 0.05) {
        continue;
      }
      const localEnd = Math.min(window.duration, cue.end - window.sourceStart);
      const start = window.start + Math.max(0, localStart);
      const end = Math.min(window.start + window.duration, window.start + localEnd);
      if (end - start < 0.25) {
        break;
      }
      mapped.push({ start: round(start), end: round(end), text: cue.text });
      break;
    }
  }
  return mapped;
}

export function totalDuration(shots: QuickCutShot[]): number {
  return round(shots.reduce((sum, shot) => sum + shot.duration, 0));
}

function round(value: number): number {
  return Number(value.toFixed(3));
}
