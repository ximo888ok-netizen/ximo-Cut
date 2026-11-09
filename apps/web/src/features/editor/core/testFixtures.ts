import { TOTAL_DURATION, type PlanShot, type Track } from "../data";
import type { ProjectState } from "./editorStore";

const tracks: Track[] = [
  {
    id: "track-v2",
    name: "V2",
    role: "标题 / 图形",
    kind: "text",
    height: 34,
    clips: [
      {
        id: "clip-title",
        name: "片头标题",
        start: 0.8,
        duration: 5.2,
        kind: "text",
        tone: "title",
        text: "风把夏天吹到了海边",
      },
      {
        id: "clip-credit",
        name: "结尾署名",
        start: 51,
        duration: 6.4,
        kind: "text",
        tone: "title",
        text: "BETWEEN TIDES",
      },
    ],
  },
  {
    id: "track-v1",
    name: "V1",
    role: "主画面",
    kind: "video",
    height: 52,
    clips: [
      { id: "clip-01", name: "DJI_0142 · 日落", start: 0, duration: 8.2, kind: "video", tone: "sunset", assetId: "asset-01" },
      { id: "clip-02", name: "A7S_0081 · 回头", start: 8.2, duration: 10.1, kind: "video", tone: "portrait", assetId: "asset-02" },
      { id: "clip-03", name: "DJI_0157 · 浪花", start: 18.3, duration: 12.6, kind: "video", tone: "wave", assetId: "asset-03" },
      { id: "clip-04", name: "A7S_0093 · 礁石", start: 30.9, duration: 11.2, kind: "video", tone: "rock", assetId: "asset-04" },
      { id: "clip-05", name: "A7S_0081 · 回望", start: 42.1, duration: 9.8, kind: "video", tone: "portrait", assetId: "asset-02" },
      { id: "clip-06", name: "DJI_0142 · 收尾", start: 51.9, duration: 7.4, kind: "video", tone: "sunset", assetId: "asset-01" },
    ],
  },
  {
    id: "track-a1",
    name: "A1",
    role: "音乐",
    kind: "audio",
    height: 40,
    clips: [
      { id: "clip-music", name: "MIDNIGHT_DRIVE · 96 BPM", start: 0, duration: 58, kind: "audio", tone: "music", assetId: "asset-05" },
    ],
  },
  {
    id: "track-a2",
    name: "A2",
    role: "环境声",
    kind: "audio",
    height: 34,
    clips: [
      { id: "clip-ambience", name: "海边环境声", start: 0, duration: 60, kind: "audio", tone: "ambience", muted: true },
    ],
  },
];

export const fixturePlanShots: PlanShot[] = [
  { id: "shot-01", range: "00:00 — 00:03", title: "日落航拍", note: "开场钩子 · 暖色", tone: "sunset", duration: "3.2s" },
  { id: "shot-02", range: "00:03 — 00:18", title: "人物回头", note: "情绪建立 · 慢动作", tone: "portrait", duration: "15.4s" },
  { id: "shot-03", range: "00:18 — 00:42", title: "浪花与礁石", note: "节奏推进 · 环境声", tone: "wave", duration: "23.4s" },
  { id: "shot-04", range: "00:42 — 00:58", title: "日落收尾", note: "留白 · 标题", tone: "sunset", duration: "16.0s" },
];

export function createFixtureProject(): ProjectState {
  return {
    id: "project-fixture",
    name: "测试工程",
    fps: 30,
    width: 1920,
    height: 1080,
    duration: TOTAL_DURATION,
    tracks: structuredClone(tracks),
    markers: [
      { id: "marker-01", time: 18.4, label: "人物回头", color: "#f3a43b" },
      { id: "marker-02", time: 42, label: "日落收尾", color: "#69d8b4" },
    ],
    revision: 1,
  };
}
