import type { Asset, ClipMask, Keyframe, RenderSettings } from "../data";
import type { ProjectState } from "./editorStore";
import { buildExportFilters } from "./looks";

export interface RenderKeyframe {
  property: string;
  time: number;
  value: number;
  easing?: string;
}

export interface RenderVideoClip {
  path: string;
  start: number;
  duration: number;
  sourceIn: number;
  speed: number;
  muted: boolean;
  volumeDb: number;
  fadeIn: number;
  fadeOut: number;
  fadeInColor: "black" | "white";
  fadeOutColor: "black" | "white";
  opacity: number;
  scale: number;
  rotation: number;
  positionX: number;
  positionY: number;
  keyframes: RenderKeyframe[];
  mask: ClipMask | null;
  blendMode: string;
  denoise: boolean;
  normalized: boolean;
  image: boolean;
  filters: string;
}

export interface RenderAudioClip {
  path: string;
  start: number;
  duration: number;
  sourceIn: number;
  speed: number;
  volumeDb: number;
  fadeIn: number;
  fadeOut: number;
  denoise: boolean;
  normalized: boolean;
  ducking: boolean;
}

export interface RenderTextClip {
  text: string;
  start: number;
  duration: number;
  fontSize: number;
  color: string;
  position: "top" | "center" | "bottom";
  bold: boolean;
  stroke: number;
  strokeColor: string;
  background: boolean;
  backgroundColor: string;
  align: "left" | "center" | "right";
  animation: "none" | "fade" | "slide";
}

export interface RenderRequest {
  width: number;
  height: number;
  fps: number;
  bitrate: string;
  format: string;
  duration: number;
  vertical: boolean;
  videoClips: RenderVideoClip[];
  audioClips: RenderAudioClip[];
  textClips: RenderTextClip[];
}

export function buildRenderRequest(
  project: ProjectState,
  assets: Asset[],
  settings: RenderSettings,
): RenderRequest {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const rangeStart = Math.max(0, Math.min(settings.rangeStart, project.duration));
  const rangeEnd = Math.max(
    rangeStart,
    Math.min(settings.rangeEnd, project.duration),
  );
  const duration = rangeEnd - rangeStart;
  if (duration <= 0.05) {
    throw new Error("导出范围为空，请调整导出起点和终点");
  }

  const videoClips: RenderVideoClip[] = [];
  const audioClips: RenderAudioClip[] = [];
  const textClips: RenderTextClip[] = [];
  const missing = new Set<string>();

  // 轨道数组从上到下排列，导出时按从下到上叠加，保证最上层轨道画面在最前面
  for (const track of [...project.tracks].reverse()) {
    if (track.hidden) {
      continue;
    }
    for (const clip of track.clips) {
      const clipStart = Math.max(clip.start, rangeStart);
      const clipEnd = Math.min(clip.start + clip.duration, rangeEnd);
      const visibleDuration = clipEnd - clipStart;
      if (visibleDuration <= 0.05) {
        continue;
      }

      if (clip.kind === "text") {
        // 字幕烧录开关只影响字幕，标题和贴纸始终导出，避免误删画面文字
        const isCaption =
          clip.textRole === "caption" || (!clip.textRole && clip.tone === "caption");
        if (isCaption && !settings.burnSubtitles) {
          continue;
        }
        const style = clip.textStyle;
        textClips.push({
          text: clip.text ?? clip.name,
          start: clipStart - rangeStart,
          duration: visibleDuration,
          fontSize: Math.round(
            settings.height * 0.05 * Math.min(2.5, Math.max(0.5, style?.size ?? 1)),
          ),
          color: normalizeTextColor(style?.color),
          position: style?.position ?? "bottom",
          bold: Boolean(style?.bold),
          stroke: Math.min(10, Math.max(0, style?.stroke ?? 0)),
          strokeColor: normalizeTextColor(style?.strokeColor),
          background: Boolean(style?.background),
          backgroundColor: normalizeTextColor(style?.backgroundColor),
          align: style?.align ?? "center",
          animation: style?.animation ?? "none",
        });
        continue;
      }

      const asset = clip.assetId ? assetMap.get(clip.assetId) : undefined;
      if (!asset?.path) {
        missing.add(asset?.name ?? clip.name);
        continue;
      }

      const speed = clip.speed && clip.speed > 0 ? clip.speed : 1;
      const sourceIn = (clip.sourceIn ?? 0) + (clipStart - clip.start) * speed;
      const transitionIn = clip.transitionIn;
      const transitionOut = clip.transitionOut;
      const fadeIn = Math.min(
        Math.max(clip.fadeIn ?? 0, transitionIn?.duration ?? 0),
        visibleDuration,
      );
      const fadeOut = Math.min(
        Math.max(clip.fadeOut ?? 0, transitionOut?.duration ?? 0),
        visibleDuration,
      );

      if (clip.kind === "video") {
        videoClips.push({
          path: asset.path,
          start: clipStart - rangeStart,
          duration: visibleDuration,
          sourceIn,
          speed,
          muted: Boolean(clip.muted || track.muted),
          volumeDb: clip.volumeDb ?? 0,
          fadeIn,
          fadeOut,
          fadeInColor: transitionIn?.type === "flash" ? "white" : "black",
          fadeOutColor: transitionOut?.type === "flash" ? "white" : "black",
          opacity: clip.opacity ?? 1,
          scale: clip.scale ?? 1,
          rotation: clip.rotation ?? 0,
          positionX: clip.positionX ?? 0,
          positionY: clip.positionY ?? 0,
          keyframes: offsetKeyframes(
            (clip.keyframes ?? []).filter((keyframe) =>
              ["scale", "rotation", "opacity", "positionX", "positionY"].includes(
                keyframe.property,
              ),
            ),
            clipStart - clip.start,
          ),
          mask: clip.mask ?? null,
          blendMode: clip.blendMode ?? "normal",
          denoise: Boolean(clip.denoise),
          normalized: Boolean(clip.normalized),
          image: Boolean(asset.isImage),
          filters: buildExportFilters(clip),
        });
      } else {
        if (clip.muted || track.muted) {
          continue;
        }
        audioClips.push({
          path: asset.path,
          start: clipStart - rangeStart,
          duration: visibleDuration,
          sourceIn,
          speed,
          volumeDb: clip.volumeDb ?? 0,
          fadeIn,
          fadeOut,
          denoise: Boolean(clip.denoise),
          normalized: Boolean(clip.normalized),
          ducking: Boolean(clip.ducking),
        });
      }
    }
  }

  if (missing.size > 0) {
    throw new Error(
      `以下素材缺少本地文件路径，请重新导入：${Array.from(missing).join("、")}`,
    );
  }
  if (videoClips.length === 0 && audioClips.length === 0 && textClips.length === 0) {
    throw new Error("时间线上没有可导出的片段");
  }

  return {
    width: settings.width,
    height: settings.height,
    fps: settings.fps,
    bitrate: settings.bitrate,
    format: settings.format,
    duration,
    vertical: settings.height > settings.width,
    videoClips,
    audioClips: audioClips.sort((a, b) => a.start - b.start),
    textClips: textClips.sort((a, b) => a.start - b.start),
  };
}

function offsetKeyframes(
  keyframes: Keyframe[],
  offset: number,
): Array<{ property: string; time: number; value: number; easing: string }> {
  const properties = new Set(keyframes.map((keyframe) => keyframe.property));
  const mapped: Array<{ property: string; time: number; value: number; easing: string }> = [];
  for (const property of properties) {
    const frames = keyframes
      .filter((keyframe) => keyframe.property === property)
      .sort((a, b) => a.time - b.time);
    const before = frames.filter((keyframe) => keyframe.time <= offset + 0.0001);
    const after = frames.filter((keyframe) => keyframe.time > offset + 0.0001);
    if (before.length > 0) {
      const last = before[before.length - 1];
      mapped.push({ ...last, time: 0, easing: last.easing ?? "linear" });
    }
    for (const keyframe of after) {
      mapped.push({
        ...keyframe,
        time: Number((keyframe.time - offset).toFixed(3)),
        easing: keyframe.easing ?? "linear",
      });
    }
  }
  return mapped.sort((a, b) => a.time - b.time);
}

const TEXT_COLORS = new Set([
  "white",
  "yellow",
  "red",
  "green",
  "black",
  "cyan",
  "magenta",
  "orange",
  "blue",
]);

export function normalizeTextColor(value: string | undefined): string {
  const color = (value ?? "").toLowerCase();
  return TEXT_COLORS.has(color) ? color : "white";
}

  /* 旧版 filter 字段的 CSS 解析已迁移到 core/looks.ts */ 
