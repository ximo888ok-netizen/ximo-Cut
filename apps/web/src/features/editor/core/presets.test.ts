import { describe, expect, it } from "vitest";
import {
  EFFECT_PRESETS,
  FILTER_PRESETS,
  LOOK_PRESETS,
  STICKER_PRESETS,
  SUBTITLE_PRESETS,
  TEXT_PRESETS,
  TRANSITION_PRESETS,
} from "./presets";
import { adjustToFfmpeg, buildExportFilters, buildPreviewFilter } from "./looks";
import { DEFAULT_ADJUST, type TrackClip } from "../data";

describe("预设库", () => {
  it("各类目数量达到目标", () => {
    expect(FILTER_PRESETS.length).toBe(120);
    expect(EFFECT_PRESETS.length).toBeGreaterThanOrEqual(90);
    expect(STICKER_PRESETS.length).toBeGreaterThanOrEqual(176);
    expect(TEXT_PRESETS.length).toBeGreaterThanOrEqual(48);
    expect(SUBTITLE_PRESETS.length).toBeGreaterThanOrEqual(18);
    expect(TRANSITION_PRESETS.length).toBeGreaterThanOrEqual(9);
  });

  it("所有 look 预设 id 唯一且双端参数齐全", () => {
    const ids = new Set(LOOK_PRESETS.map((preset) => preset.id));
    expect(ids.size).toBe(LOOK_PRESETS.length);
    for (const preset of LOOK_PRESETS) {
      expect(preset.css.trim().length).toBeGreaterThan(0);
      expect(preset.ffmpeg.trim().length).toBeGreaterThan(0);
      expect(preset.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("滤镜与特效覆盖多个分类", () => {
    expect(new Set(FILTER_PRESETS.map((preset) => preset.category)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(EFFECT_PRESETS.map((preset) => preset.category)).size).toBeGreaterThanOrEqual(6);
  });

  it("贴纸分类与文本模板完整", () => {
    expect(new Set(STICKER_PRESETS.map((preset) => preset.category)).size).toBeGreaterThanOrEqual(8);
    const textIds = new Set(TEXT_PRESETS.map((preset) => preset.id));
    expect(textIds.size).toBe(TEXT_PRESETS.length);
    for (const preset of TEXT_PRESETS) {
      expect(preset.sample.length).toBeGreaterThan(0);
      expect(preset.style.size).toBeGreaterThan(0);
    }
  });
});

describe("look 与调节翻译", () => {
  const clip = (patch: Partial<TrackClip>): TrackClip => ({
    id: "clip-1",
    name: "测试",
    start: 0,
    duration: 3,
    kind: "video",
    tone: "wave",
    ...patch,
  });

  it("滤镜用预设参数生成导出链", () => {
    const filters = buildExportFilters(clip({ look: "warm-sun" }));
    expect(filters).toContain("colorbalance=");
    expect(filters).toContain("eq=");
  });

  it("特效预设保留暗角与颗粒等质感滤镜", () => {
    expect(buildExportFilters(clip({ look: "fx-vignette" }))).toContain("vignette");
    expect(buildExportFilters(clip({ look: "fx-grain" }))).toContain("noise");
  });

  it("调节参数叠加到同一滤镜链", () => {
    const filters = buildExportFilters(
      clip({ look: "fresh-clear", adjust: { brightness: 12, vignette: 40, sharpen: 30 } }),
    );
    expect(filters).toContain("eq=");
    expect(filters).toContain("unsharp=");
    expect(filters).toContain("vignette=");
  });

  it("预览同时输出 CSS 与叠加层", () => {
    const css = buildPreviewFilter(clip({ look: "fx-old-film" }));
    expect(css).toContain("sepia");
    const preview = buildPreviewFilter(clip({ adjust: { temperature: 40, tint: -20 } }));
    expect(preview).toContain("sepia");
  });

  it("全零调节不输出多余滤镜", () => {
    expect(adjustToFfmpeg(DEFAULT_ADJUST)).toBe("");
  });

  it("旧版 filter 字段仍可导出", () => {
    const filters = buildExportFilters(clip({ filter: "grayscale(1) contrast(1.1)" }));
    expect(filters).toContain("hue=s=");
    expect(filters).toContain("eq=");
  });
});
