import type { TextStyle, TransitionSpec } from "../../data";

export type PresetOverlay = "vignette" | "grain" | "scanline" | "frame" | "frame-dark";

export interface LookPreset {
  id: string;
  label: string;
  category: string;
  css: string;
  ffmpeg: string;
  overlay?: PresetOverlay;
}

export interface TextPreset {
  id: string;
  label: string;
  category: string;
  sample: string;
  style: TextStyle;
}

export interface StickerPreset {
  id: string;
  label: string;
  glyph: string;
  category: string;
}

export interface TransitionPreset {
  id: string;
  label: string;
  type: TransitionSpec["type"];
  duration: number;
  note: string;
}
