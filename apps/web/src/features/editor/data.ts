export type AssetKind = "video" | "audio";

export interface Asset {
  id: string;
  name: string;
  meta: string;
  duration: string;
  kind: AssetKind;
  quality?: number;
  tone: string;
  tag: string;
  url?: string;
  path?: string;
  sizeBytes?: number;
  thumbnail?: string;
  isImage?: boolean;
}

export interface DraftMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  duration: number;
  clipCount: number;
  assetCount: number;
  cover?: string;
  tone: string;
}

export interface PlanShot {
  id: string;
  range: string;
  title: string;
  note: string;
  tone: string;
  duration: string;
  assetId?: string;
  sourceIn?: number;
  speed?: number;
  transition?: "fade" | "flash";
  beat?: string;
  look?: string;
}

export interface TransitionSpec {
  type: "fade" | "flash" | "crossfade" | "wipe";
  duration: number;
}

export type TextPosition = "top" | "center" | "bottom";
export type TextAlign = "left" | "center" | "right";
export type TextAnimation = "none" | "fade" | "slide";

export interface TextStyle {
  size: number;
  color: string;
  position: TextPosition;
  bold?: boolean;
  stroke?: number;
  strokeColor?: string;
  background?: boolean;
  backgroundColor?: string;
  align?: TextAlign;
  animation?: TextAnimation;
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  size: 1,
  color: "white",
  position: "bottom",
};

export interface Keyframe {
  id: string;
  property: "opacity" | "scale" | "rotation" | "positionX" | "positionY" | "volumeDb";
  time: number;
  value: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "hold";
}

export interface Marker {
  id: string;
  time: number;
  label: string;
  color?: string;
}

export interface RenderSettings {
  width: number;
  height: number;
  fps: number;
  bitrate: string;
  format: "mp4" | "webm";
  burnSubtitles: boolean;
  rangeStart: number;
  rangeEnd: number;
}

export type AssetTab =
  | "media"
  | "audio"
  | "text"
  | "stickers"
  | "effects"
  | "transitions"
  | "filters"
  | "adjust"
  | "captions";

export type MaskShape = "rect" | "ellipse" | "linear";

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "soft-light"
  | "darken"
  | "lighten";

export interface ClipMask {
  shape: MaskShape;
  x: number;
  y: number;
  width: number;
  height: number;
  feather: number;
  invert: boolean;
}

export interface ClipAdjust {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  tint?: number;
  highlights?: number;
  shadows?: number;
  sharpen?: number;
  grain?: number;
  vignette?: number;
  fade?: number;
  hue?: number;
  exposure?: number;
  vibrance?: number;
}

export const DEFAULT_ADJUST: Required<ClipAdjust> = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  sharpen: 0,
  grain: 0,
  vignette: 0,
  fade: 0,
  hue: 0,
  exposure: 0,
  vibrance: 0,
};

export interface TrackClip {
  id: string;
  name: string;
  start: number;
  duration: number;
  kind: "video" | "audio" | "text";
  tone: string;
  text?: string;
  textStyle?: TextStyle;
  textRole?: "caption" | "title" | "sticker";
  assetId?: string;
  sourceIn?: number;
  speed?: number;
  muted?: boolean;
  volumeDb?: number;
  opacity?: number;
  scale?: number;
  rotation?: number;
  positionX?: number;
  positionY?: number;
  mask?: ClipMask;
  blendMode?: BlendMode;
  ducking?: boolean;
  denoise?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  normalized?: boolean;
  eq?: { low: number; mid: number; high: number };
  syncOffset?: number;
  transitionIn?: TransitionSpec;
  transitionOut?: TransitionSpec;
  keyframes?: Keyframe[];
  groupId?: string;
  filter?: string;
  look?: string;
  adjust?: ClipAdjust;
}

export interface Track {
  id: string;
  name: string;
  role: string;
  kind: "video" | "audio" | "text";
  height: number;
  clips: TrackClip[];
  muted?: boolean;
  locked?: boolean;
  hidden?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export interface CaptionCue {
  id: string;
  start: number;
  time: string;
  text: string;
}

export const TOTAL_DURATION = 60;

export const timelineTracks: Track[] = [
  {
    id: "track-v2",
    name: "V2",
    role: "标题 / 图形",
    kind: "text",
    height: 34,
    clips: [],
  },
  {
    id: "track-v1",
    name: "V1",
    role: "主画面",
    kind: "video",
    height: 52,
    clips: [],
  },
  {
    id: "track-a1",
    name: "A1",
    role: "音乐",
    kind: "audio",
    height: 40,
    clips: [],
  },
  {
    id: "track-a2",
    name: "A2",
    role: "环境声",
    kind: "audio",
    height: 34,
    clips: [],
  },
];

export function formatTimecode(seconds: number, fps = 30): string {
  const safe = Math.max(0, seconds);
  const totalFrames = Math.round(safe * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hours, minutes, secs, frames]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function parseMediaDuration(value: string): number | null {
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}
