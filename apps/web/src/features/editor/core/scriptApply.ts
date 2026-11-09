import type { Asset, TrackClip, TransitionSpec } from "../data";
import type { ScriptDoc } from "./scripts";

// 景别用中心裁切近似：近景和特写放大画面，其余保持原构图
const SHOT_SCALE: Record<string, number> = {
  近景: 1.12,
  特写: 1.25,
};

function scriptTransition(value: string): {
  in?: TransitionSpec;
  out?: TransitionSpec;
} {
  if (value === "淡入") {
    return { in: { type: "fade", duration: 0.5 } };
  }
  if (value === "淡出") {
    return { out: { type: "fade", duration: 0.5 } };
  }
  return {};
}

export interface ScriptApplySummary {
  videoClips: TrackClip[];
  textClips: TrackClip[];
  shotsUsed: number;
  trimmedShots: number;
}

export function pickScriptAssets(assets: Asset[]): Asset[] {
  return assets.filter((asset) => asset.kind === "video" && Boolean(asset.url));
}

/**
 * 把分镜脚本展开成时间线片段：画面按镜头顺序套用素材，台词生成字幕片段。
 * 素材短于镜头时长时按素材实际长度裁剪，避免导出时出现黑帧。
 */
export function buildScriptClips(
  doc: ScriptDoc,
  assets: Asset[],
  offset = 0,
): ScriptApplySummary {
  const usable = pickScriptAssets(assets);
  const videoClips: TrackClip[] = [];
  const textClips: TrackClip[] = [];
  let trimmedShots = 0;
  let cursor = offset;

  doc.shots.forEach((shot, index) => {
    const asset = usable[index % Math.max(1, usable.length)];
    const assetSeconds = asset ? parseClock(asset.duration) ?? 5 : 0;
    const duration =
      asset && assetSeconds > 0.2
        ? Math.min(shot.duration, assetSeconds)
        : shot.duration;
    if (asset && duration < shot.duration - 0.05) {
      trimmedShots += 1;
    }
    const finalDuration = Number(Math.max(0.5, duration).toFixed(3));
    const clipStart = Number(cursor.toFixed(3));
    const transition = scriptTransition(shot.transition);
    videoClips.push({
      id: `script-${doc.id}-v-${index}`,
      name: shot.description.trim() || shot.shotSize || `镜头 ${index + 1}`,
      start: clipStart,
      duration: finalDuration,
      kind: "video",
      tone: asset?.tone ?? "wave",
      assetId: asset?.id,
      sourceIn: 0,
      scale: SHOT_SCALE[shot.shotSize],
      transitionIn: transition.in,
      transitionOut: transition.out,
    });
    if (shot.dialogue.trim()) {
      textClips.push({
        id: `script-${doc.id}-t-${index}`,
        name: shot.dialogue.trim().slice(0, 16),
        text: shot.dialogue.trim(),
        start: clipStart,
        duration: finalDuration,
        kind: "text",
        tone: "title",
        textRole: "caption",
        textStyle: { size: 1, color: "white", position: "bottom" },
      });
    }
    cursor += finalDuration;
  });

  return { videoClips, textClips, shotsUsed: doc.shots.length, trimmedShots };
}

function parseClock(value: string): number | null {
  const match = value.match(/^(\d+):(\d+)$/);
  if (!match) {
    const seconds = Number.parseFloat(value);
    return Number.isFinite(seconds) ? seconds : null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}
