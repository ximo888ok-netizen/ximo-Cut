import type { FootageAnalysis } from "./review";

export type StoryStyle = "cinematic" | "energy" | "vlog" | "commercial" | "documentary";

export interface StoryStylePreset {
  label: string;
  look: string;
  shotSeconds: number;
  transition: "fade" | "flash";
  description: string;
}

export const STORY_STYLES: Record<StoryStyle, StoryStylePreset> = {
  cinematic: {
    label: "电影感",
    look: "cine-teal",
    shotSeconds: 3.8,
    transition: "fade",
    description: "青橙调、长镜头、克制的淡入淡出",
  },
  energy: {
    label: "高能卡点",
    look: "mood-neon",
    shotSeconds: 1.4,
    transition: "flash",
    description: "快切、霓虹高饱和、闪光转场",
  },
  vlog: {
    label: "治愈 Vlog",
    look: "warm-golden",
    shotSeconds: 2.8,
    transition: "fade",
    description: "暖调、轻快、自然衔接",
  },
  commercial: {
    label: "商业广告",
    look: "land-vivid",
    shotSeconds: 2.2,
    transition: "flash",
    description: "高对比、强节奏、突出主体",
  },
  documentary: {
    label: "纪实",
    look: "retro-film",
    shotSeconds: 4.5,
    transition: "fade",
    description: "真实质感、长镜头、少修饰",
  },
};

export const STORY_STYLE_OPTIONS = Object.entries(STORY_STYLES).map(([id, preset]) => ({
  id: id as StoryStyle,
  ...preset,
}));

export interface StoryPlanShot {
  assetId: string;
  assetName: string;
  title: string;
  note: string;
  duration: number;
  sourceIn: number;
  score: number;
  beat: string;
  look: string;
  transition?: "fade" | "flash";
}

export interface StoryPlan {
  style: StoryStyle;
  styleLabel: string;
  targetDuration: number;
  totalDuration: number;
  shots: StoryPlanShot[];
}

interface Candidate extends StoryPlanShot {
  shotDuration: number;
}

/** 从素材镜头质量分析里挑选最佳镜头，按叙事节拍排成一支成片方案。 */
export function buildStoryPlan(
  analyses: FootageAnalysis[],
  options: { targetDuration?: number; style?: StoryStyle } = {},
): StoryPlan {
  const style = options.style && STORY_STYLES[options.style] ? options.style : "cinematic";
  const preset = STORY_STYLES[style];
  const target = Math.min(300, Math.max(5, options.targetDuration ?? 30));
  const candidates: Candidate[] = [];

  for (const analysis of analyses) {
    const shots = analysis.shots ?? [];
    for (const shot of shots) {
      const shotDuration = shot.end - shot.start;
      if (shotDuration < 0.6 || !Number.isFinite(shot.score) || shot.score < 30) {
        continue;
      }
      candidates.push({
        assetId: analysis.assetId,
        assetName: analysis.name,
        title: analysis.name,
        note: `画面质量 ${shot.score.toFixed(0)} 分`,
        duration: 0,
        sourceIn: Number(shot.start.toFixed(3)),
        shotDuration,
        score: shot.score,
        beat: "",
        look: preset.look,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const desired = Math.min(12, Math.max(3, Math.round(target / preset.shotSeconds)));
  const picks: Candidate[] = [];
  for (const candidate of candidates) {
    if (picks.length >= desired) break;
    if (picks.length > 0 && picks[picks.length - 1].assetId === candidate.assetId) continue;
    picks.push(candidate);
  }
  if (picks.length < Math.min(3, candidates.length)) {
    for (const candidate of candidates) {
      if (picks.length >= desired) break;
      if (!picks.includes(candidate)) picks.push(candidate);
    }
  }
  if (picks.length === 0) {
    return {
      style,
      styleLabel: preset.label,
      targetDuration: target,
      totalDuration: 0,
      shots: [],
    };
  }

  const ordered = arrangeByBeat(picks);
  const shotDuration = Math.min(8, Math.max(0.6, target / ordered.length));
  let total = 0;
  const shots = ordered.map((candidate, index) => {
    const duration = Number(Math.min(shotDuration, candidate.shotDuration).toFixed(3));
    total += duration;
    return {
      assetId: candidate.assetId,
      assetName: candidate.assetName,
      title: candidate.title,
      note: candidate.note,
      duration,
      sourceIn: candidate.sourceIn,
      score: candidate.score,
      beat: candidate.beat,
      look: candidate.look,
      transition: index === 0 ? undefined : preset.transition,
    };
  });

  return {
    style,
    styleLabel: preset.label,
    targetDuration: target,
    totalDuration: Number(total.toFixed(3)),
    shots,
  };
}

function arrangeByBeat(picks: Candidate[]): Candidate[] {
  if (picks.length === 1) {
    return [{ ...picks[0], beat: "开场钩子" }];
  }
  if (picks.length === 2) {
    return [
      { ...picks[0], beat: "开场钩子" },
      { ...picks[1], beat: "收尾" },
    ];
  }
  const climaxIndex = Math.min(
    picks.length - 2,
    Math.max(1, Math.round((picks.length - 1) * 0.7)),
  );
  return picks.map((pick, index) => {
    let beat: string;
    if (index === 0) beat = "开场钩子";
    else if (index === picks.length - 1) beat = "收尾";
    else if (index === climaxIndex) beat = "高潮";
    else beat = index < climaxIndex ? "铺垫" : "推进";
    return { ...pick, beat };
  });
}
