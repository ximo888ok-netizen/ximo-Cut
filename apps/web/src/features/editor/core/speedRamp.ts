import type { TrackClip } from "../data";

export type SpeedRampPreset = "slow" | "fast" | "bullet";

export const SPEED_RAMP_LABELS: Record<SpeedRampPreset, string> = {
  slow: "慢动作爆点",
  fast: "加速转场",
  bullet: "子弹时间",
};

interface RampPart {
  fraction: number;
  speed: number;
  label: string;
}

const PRESETS: Record<SpeedRampPreset, RampPart[]> = {
  slow: [
    { fraction: 0.3, speed: 1, label: "A" },
    { fraction: 0.4, speed: 0.4, label: "B" },
    { fraction: 0.3, speed: 1, label: "C" },
  ],
  fast: [
    { fraction: 0.3, speed: 1, label: "A" },
    { fraction: 0.4, speed: 2, label: "B" },
    { fraction: 0.3, speed: 1, label: "C" },
  ],
  bullet: [
    { fraction: 0.35, speed: 1, label: "A" },
    { fraction: 0.3, speed: 0.25, label: "B" },
    { fraction: 0.35, speed: 1, label: "C" },
  ],
};

export interface SpeedRampResult {
  clips: TrackClip[];
  delta: number;
  total: number;
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

function buildRamp(
  clips: TrackClip[],
  clipId: string,
  parts: RampPart[],
): SpeedRampResult | { error: string } {
  const sorted = [...clips].sort((a, b) => a.start - b.start);
  const index = sorted.findIndex((clip) => clip.id === clipId);
  if (index < 0) {
    return { error: "找不到要变速的片段" };
  }
  const clip = sorted[index];
  if (clip.kind !== "video") {
    return { error: "速度斜坡只支持视频片段" };
  }

  const baseSpeed = clip.speed && clip.speed > 0 ? clip.speed : 1;
  const sourceTotal = clip.duration * baseSpeed;
  const segments: TrackClip[] = [];
  let cursor = clip.start;
  let sourceCursor = clip.sourceIn ?? 0;

  parts.forEach((part, partIndex) => {
    const sourceDuration = sourceTotal * part.fraction;
    const duration = sourceDuration / part.speed;
    segments.push({
      ...structuredClone(clip),
      id: `${clip.id}-ramp-${part.label.toLowerCase()}`,
      name: `${clip.name} ${part.label}`,
      start: round(cursor),
      duration: round(duration),
      sourceIn: round(sourceCursor),
      speed: part.speed,
      transitionIn: partIndex === 0 ? clip.transitionIn : undefined,
      transitionOut: partIndex === parts.length - 1 ? clip.transitionOut : undefined,
      keyframes: [],
    });
    cursor += duration;
    sourceCursor += sourceDuration;
  });

  // 关键帧按“源素材时间”重新映射到对应分段
  for (const keyframe of clip.keyframes ?? []) {
    const sourceTime = (clip.sourceIn ?? 0) + keyframe.time * baseSpeed;
    const target = segments.find((segment) => {
      const segmentSourceEnd =
        (segment.sourceIn ?? 0) + segment.duration * (segment.speed ?? 1);
      return sourceTime >= (segment.sourceIn ?? 0) - 0.001 && sourceTime <= segmentSourceEnd + 0.001;
    });
    if (target) {
      target.keyframes = [
        ...(target.keyframes ?? []),
        {
          ...keyframe,
          time: round(
            Math.max(0, (sourceTime - (target.sourceIn ?? 0)) / (target.speed ?? 1)),
          ),
        },
      ];
    }
  }

  const total = round(cursor - clip.start);
  const delta = total - clip.duration;
  const before = sorted.slice(0, index);
  const after = sorted.slice(index + 1).map((item) => ({
    ...item,
    start: round(item.start + delta),
  }));

  return {
    clips: [...before, ...segments, ...after],
    delta: round(delta),
    total,
  };
}

/** 把片段拆成三段速度斜坡，并把同一轨道后面的片段整体平移，保证不重叠 */
export function buildSpeedRamp(
  clips: TrackClip[],
  clipId: string,
  preset: SpeedRampPreset,
): SpeedRampResult | { error: string } {
  return buildRamp(clips, clipId, PRESETS[preset]);
}

/** 五段式自定义速度曲线：慢起、过渡、峰值、过渡、慢收 */
export function buildCustomSpeedRamp(
  clips: TrackClip[],
  clipId: string,
  options: { peakSpeed: number; fraction: number },
): SpeedRampResult | { error: string } {
  const peak = Math.min(4, Math.max(0.25, options.peakSpeed));
  if (Math.abs(peak - 1) < 0.01) {
    return { error: "自定义峰值速度不能等于 1x" };
  }
  const fraction = Math.min(0.8, Math.max(0.1, options.fraction));
  const rest = (1 - fraction) / 2;
  const middle = Math.sqrt(peak);
  return buildRamp(clips, clipId, [
    { fraction: rest, speed: 1, label: "A" },
    { fraction: fraction * 0.25, speed: middle, label: "B" },
    { fraction: fraction * 0.5, speed: peak, label: "C" },
    { fraction: fraction * 0.25, speed: middle, label: "D" },
    { fraction: rest, speed: 1, label: "E" },
  ]);
}
