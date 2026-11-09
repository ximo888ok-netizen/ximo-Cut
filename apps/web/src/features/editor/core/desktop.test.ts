import { describe, expect, it } from "vitest";
import type { Asset, RenderSettings } from "../data";
import { parseProjectFile, serializeProjectFile } from "./desktop";
import { createFixtureProject } from "./testFixtures";

const assets: Asset[] = [
  {
    id: "asset-01",
    name: "a.mp4",
    meta: "1 MB · 视频",
    duration: "00:10",
    kind: "video",
    tone: "wave",
    tag: "本地视频",
    path: "C:\\media\\a.mp4",
    url: "asset://localhost/C%3A/media/a.mp4",
  },
  {
    id: "asset-02",
    name: "still.png",
    meta: "图片",
    duration: "00:05",
    kind: "video",
    tone: "wave",
    tag: "本地图片",
    path: "C:\\media\\still.png",
    isImage: true,
  },
];

const settings: RenderSettings = {
  width: 1280,
  height: 720,
  fps: 30,
  bitrate: "8 Mbps",
  format: "mp4",
  burnSubtitles: true,
  rangeStart: 1,
  rangeEnd: 9,
};

describe("工程文件序列化", () => {
  it("保存后重新打开能还原轨道、素材与导出设置", () => {
    const project = createFixtureProject();
    project.tracks[0].clips[0].textStyle = { size: 1.4, color: "yellow", position: "top" };
    const json = serializeProjectFile(project, assets, settings, []);
    const parsed = parseProjectFile(json);
    expect(parsed.project.tracks.length).toBe(project.tracks.length);
    expect(parsed.project.tracks[1].clips.length).toBe(project.tracks[1].clips.length);
    expect(parsed.project.tracks[0].clips[0].textStyle).toEqual({
      size: 1.4,
      color: "yellow",
      position: "top",
    });
    expect(parsed.assets[0].path).toBe("C:\\media\\a.mp4");
    expect(parsed.assets[0].url).toBeUndefined();
    expect(parsed.assets[1].isImage).toBe(true);
    expect(parsed.render_settings.rangeStart).toBe(1);
    expect(parsed.render_settings.rangeEnd).toBe(9);
  });

  it("保存并恢复音频分析结果", () => {
    const project = createFixtureProject();
    const analysis = {
      file_name: "e.m4a",
      duration_ms: 60000,
      sample_rate: 48000,
      channels: 2,
      peak_db: -1.2,
      rms_db: -18.4,
      estimated_lufs: -16.8,
      silence_ranges: [{ start_ms: 1000, end_ms: 2000 }],
      waveform: [0.1, 0.4, 0.2],
      bpm: 96,
      beats_ms: [0, 625, 1250],
    };
    const json = serializeProjectFile(project, assets, settings, [], [analysis]);
    expect(parseProjectFile(json).audio_analyses).toEqual([analysis]);
  });

  it("拒绝非 ximo-Cut 工程文件", () => {
    expect(() => parseProjectFile(JSON.stringify({ hello: "world" }))).toThrow(
      /不是有效的 ximo-Cut 工程文件/,
    );
  });
});
