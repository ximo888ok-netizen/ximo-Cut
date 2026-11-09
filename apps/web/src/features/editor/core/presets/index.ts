export type { LookPreset, PresetOverlay, StickerPreset, TextPreset, TransitionPreset } from "./types";
export { EFFECT_PRESETS as BASE_EFFECT_PRESETS } from "./effects";
export { JIANYING_EFFECT_PRESETS } from "./effects-jianying";
export { FILTER_PRESETS } from "./filters";
export { STICKER_PRESETS } from "./stickers";
export { SUBTITLE_PRESETS, TEXT_PRESETS } from "./texts";
export { TRANSITION_PRESETS } from "./transitions";

import { EFFECT_PRESETS as BASE_EFFECTS } from "./effects";
import { JIANYING_EFFECT_PRESETS } from "./effects-jianying";
import { FILTER_PRESETS } from "./filters";
import type { LookPreset } from "./types";

/** 基础特效 + 按剪映命名补充的特效。 */
export const EFFECT_PRESETS: LookPreset[] = [...BASE_EFFECTS, ...JIANYING_EFFECT_PRESETS];

/** 滤镜 + 特效统称 look，clip.look 存预设 id。 */
export const LOOK_PRESETS: LookPreset[] = [...FILTER_PRESETS, ...EFFECT_PRESETS];

const LOOK_MAP = new Map(LOOK_PRESETS.map((preset) => [preset.id, preset]));

export function findLook(id: string | undefined): LookPreset | undefined {
  return id ? LOOK_MAP.get(id) : undefined;
}

export function presetCategories(presets: Array<{ category: string }>): string[] {
  const seen: string[] = [];
  for (const preset of presets) {
    if (!seen.includes(preset.category)) {
      seen.push(preset.category);
    }
  }
  return seen;
}
