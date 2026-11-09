import { DEFAULT_ADJUST, type ClipAdjust, type TrackClip } from "../data";
import { findLook, type PresetOverlay } from "./presets";

export function clipAdjust(clip: TrackClip): Required<ClipAdjust> {
  return { ...DEFAULT_ADJUST, ...(clip.adjust ?? {}) };
}

/** 预览用 CSS filter：look 与调节叠加。 */
export function buildPreviewFilter(clip: TrackClip): string | undefined {
  const parts: string[] = [];
  const look = findLook(clip.look);
  if (look?.css) {
    parts.push(look.css);
  } else if (clip.filter) {
    parts.push(clip.filter);
  }
  const adjustCss = adjustToCss(clipAdjust(clip));
  if (adjustCss) {
    parts.push(adjustCss);
  }
  const joined = parts.join(" ").trim();
  return joined.length > 0 ? joined : undefined;
}

/** 预览叠加层：暗角、颗粒、扫描线。 */
export function clipOverlays(clip: TrackClip): PresetOverlay[] {
  const overlays: PresetOverlay[] = [];
  const look = findLook(clip.look);
  if (look?.overlay) {
    overlays.push(look.overlay);
  }
  const adjust = clipAdjust(clip);
  if (adjust.vignette > 1) {
    overlays.push("vignette");
  }
  if (adjust.grain > 1) {
    overlays.push("grain");
  }
  return Array.from(new Set(overlays));
}

/** 导出用 FFmpeg 滤镜串：look 与调节叠加，旧草稿的 filter 字段继续兼容。 */
export function buildExportFilters(clip: TrackClip): string {
  const parts: string[] = [];
  const look = findLook(clip.look);
  if (look?.ffmpeg) {
    parts.push(look.ffmpeg);
  } else if (clip.filter) {
    const legacy = legacyCssToFilters(clip.filter);
    if (legacy) {
      parts.push(legacy);
    }
  }
  const adjust = adjustToFfmpeg(clipAdjust(clip));
  if (adjust) {
    parts.push(adjust);
  }
  return parts.join(",");
}

export function adjustToCss(adjust: Required<ClipAdjust>): string {
  const parts: string[] = [];
  const brightness = 1 + adjust.brightness / 100 + adjust.exposure / 200 - adjust.fade / 400;
  const contrast = 1 + adjust.contrast / 100 + adjust.highlights / 500 - adjust.shadows / 600;
  const saturation = Math.max(
    0,
    1 + adjust.saturation / 100 + adjust.vibrance / 200 - adjust.fade / 220,
  );
  const hue = adjust.hue + adjust.temperature / 8 + adjust.tint / 4;

  if (Math.abs(brightness - 1) > 0.002) {
    parts.push(`brightness(${brightness.toFixed(3)})`);
  }
  if (Math.abs(contrast - 1) > 0.002) {
    parts.push(`contrast(${contrast.toFixed(3)})`);
  }
  if (Math.abs(saturation - 1) > 0.002) {
    parts.push(`saturate(${saturation.toFixed(3)})`);
  }
  if (Math.abs(hue) > 0.5) {
    parts.push(`hue-rotate(${hue.toFixed(1)}deg)`);
  }
  if (adjust.temperature > 1) {
    parts.push(`sepia(${(adjust.temperature / 600).toFixed(3)})`);
  }
  if (adjust.sharpen > 1) {
    parts.push(`contrast(${(1 + adjust.sharpen / 800).toFixed(3)})`);
  }
  return parts.join(" ");
}

export function adjustToFfmpeg(adjust: Required<ClipAdjust>): string {
  const parts: string[] = [];
  const brightness = clamp(adjust.brightness / 100 + adjust.exposure / 200 - adjust.fade / 300, -1, 1);
  const contrast = clamp(
    1 + adjust.contrast / 100 + adjust.highlights / 400 - adjust.shadows / 400 - adjust.fade / 500,
    0.2,
    3,
  );
  const saturation = clamp(
    1 + adjust.saturation / 100 + adjust.vibrance / 200 - adjust.fade / 200,
    0,
    3,
  );
  const gamma = clamp(1 + adjust.shadows / 250 - adjust.highlights / 400, 0.3, 3);

  const eq: string[] = [];
  if (Math.abs(brightness) > 0.002) {
    eq.push(`brightness=${brightness.toFixed(3)}`);
  }
  if (Math.abs(contrast - 1) > 0.002) {
    eq.push(`contrast=${contrast.toFixed(3)}`);
  }
  if (Math.abs(saturation - 1) > 0.002) {
    eq.push(`saturation=${saturation.toFixed(3)}`);
  }
  if (Math.abs(gamma - 1) > 0.005) {
    eq.push(`gamma=${gamma.toFixed(3)}`);
  }
  if (eq.length > 0) {
    parts.push(`eq=${eq.join(":")}`);
  }

  const hue = adjust.hue + adjust.temperature / 8 + adjust.tint / 4;
  if (Math.abs(hue) > 0.5) {
    parts.push(`hue=h=${hue.toFixed(1)}`);
  }

  const balance: Record<string, number> = {};
  const add = (key: string, value: number) => {
    balance[key] = (balance[key] ?? 0) + value;
  };
  if (adjust.temperature > 1) {
    add("rm", adjust.temperature / 500);
    add("bm", -adjust.temperature / 600);
  } else if (adjust.temperature < -1) {
    add("bm", -adjust.temperature / 500);
    add("rm", adjust.temperature / 700);
  }
  if (adjust.tint > 1) {
    add("gm", adjust.tint / 500);
    add("bm", adjust.tint / 800);
  } else if (adjust.tint < -1) {
    add("gm", adjust.tint / 600);
    add("rm", -adjust.tint / 900);
  }
  const balanceParts = Object.entries(balance)
    .filter(([, value]) => Math.abs(value) > 0.002)
    .map(([key, value]) => `${key}=${value.toFixed(3)}`);
  if (balanceParts.length > 0) {
    parts.push(`colorbalance=${balanceParts.join(":")}`);
  }

  if (adjust.sharpen > 1) {
    parts.push(`unsharp=5:5:${(adjust.sharpen / 50).toFixed(2)}:5:5:0`);
  }
  if (adjust.grain > 1) {
    parts.push(`noise=alls=${Math.round(adjust.grain / 4)}:allf=t+u`);
  }
  if (adjust.vignette > 1) {
    parts.push(`vignette=PI/${Math.max(1.3, 5 - adjust.vignette / 28).toFixed(2)}`);
  }
  return parts.join(",");
}

function legacyCssToFilters(filter: string): string {
  let brightness = 1;
  let contrast = 1;
  let saturation = 1;
  let hue = 0;
  let grayscale = 0;

  for (const match of filter.matchAll(/([a-z-]+)\((-?[\d.]+)(?:deg)?\)/g)) {
    const name = match[1];
    const value = Number(match[2]);
    if (!Number.isFinite(value)) {
      continue;
    }
    switch (name) {
      case "brightness":
        brightness *= value;
        break;
      case "contrast":
        contrast *= value;
        break;
      case "saturate":
        saturation *= value;
        break;
      case "grayscale":
        grayscale = Math.max(grayscale, value);
        break;
      case "sepia":
        saturation *= 1 - Math.min(1, value) * 0.5;
        hue -= Math.min(1, value) * 12;
        break;
      case "hue-rotate":
        hue += value;
        break;
      default:
        break;
    }
  }

  const parts: string[] = [];
  const eq: string[] = [];
  if (Math.abs(brightness - 1) > 0.001) {
    eq.push(`brightness=${(brightness - 1).toFixed(3)}`);
  }
  if (Math.abs(contrast - 1) > 0.001) {
    eq.push(`contrast=${contrast.toFixed(3)}`);
  }
  if (Math.abs(saturation - 1) > 0.001) {
    eq.push(`saturation=${saturation.toFixed(3)}`);
  }
  if (eq.length > 0) {
    parts.push(`eq=${eq.join(":")}`);
  }
  if (grayscale > 0.001) {
    parts.push(`hue=s=${Math.max(0, 1 - grayscale).toFixed(3)}`);
  }
  if (Math.abs(hue) > 0.5) {
    parts.push(`hue=h=${hue.toFixed(1)}`);
  }
  return parts.join(",");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
