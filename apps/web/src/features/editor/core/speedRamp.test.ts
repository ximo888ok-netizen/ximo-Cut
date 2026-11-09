import { describe, expect, it } from "vitest";
import type { TrackClip } from "../data";
import { buildCustomSpeedRamp, buildSpeedRamp } from "./speedRamp";

const clips: TrackClip[] = [
  {
    id: "clip-a",
    name: "主镜头",
    start: 0,
    duration: 10,
    kind: "video",
    tone: "wave",
    sourceIn: 0,
    speed: 1,
    keyframes: [
      { id: "kf-1", property: "scale", time: 5, value: 1.2, easing: "linear" },
    ],
  },
  {
    id: "clip-b",
    name: "后续镜头",
    start: 12,
    duration: 3,
    kind: "video",
    tone: "sunset",
  },
];

describe("buildSpeedRamp", () => {
  it("慢动作爆点：中间段变慢并顺延后续片段", () => {
    const result = buildSpeedRamp(clips, "clip-a", "slow");
    if ("error" in result) throw new Error(result.error);
    expect(result.clips.map((clip) => clip.id)).toEqual([
      "clip-a-ramp-a",
      "clip-a-ramp-b",
      "clip-a-ramp-c",
      "clip-b",
    ]);
    expect(result.clips[1].duration).toBeCloseTo(10, 3);
    expect(result.total).toBeCloseTo(16, 3);
    expect(result.delta).toBeCloseTo(6, 3);
    expect(result.clips[3].start).toBeCloseTo(18, 3);
  });

  it("加速转场：中间段变快并前移后续片段", () => {
    const result = buildSpeedRamp(clips, "clip-a", "fast");
    if ("error" in result) throw new Error(result.error);
    expect(result.clips[1].duration).toBeCloseTo(2, 3);
    expect(result.total).toBeCloseTo(8, 3);
    expect(result.delta).toBeCloseTo(-2, 3);
    expect(result.clips[3].start).toBeCloseTo(10, 3);
  });

  it("关键帧按源素材时间映射到对应分段", () => {
    const result = buildSpeedRamp(clips, "clip-a", "slow");
    if ("error" in result) throw new Error(result.error);
    const middle = result.clips[1];
    expect(middle.keyframes).toHaveLength(1);
    expect(middle.keyframes?.[0].time).toBeCloseTo(5, 3);
  });

  it("自定义曲线生成五段渐变并顺延后续片段", () => {
    const result = buildCustomSpeedRamp(clips, "clip-a", { peakSpeed: 0.5, fraction: 0.4 });
    if ("error" in result) throw new Error(result.error);
    expect(result.clips.map((clip) => clip.id)).toEqual([
      "clip-a-ramp-a",
      "clip-a-ramp-b",
      "clip-a-ramp-c",
      "clip-a-ramp-d",
      "clip-a-ramp-e",
      "clip-b",
    ]);
    expect(result.clips.slice(0, 5).map((clip) => clip.speed)).toEqual([
      1,
      Math.sqrt(0.5),
      0.5,
      Math.sqrt(0.5),
      1,
    ]);
    expect(result.total).toBeCloseTo(12.828, 2);
    expect(result.clips[5].start).toBeCloseTo(14.828, 2);
  });

  it("自定义峰值等于 1x 时拒绝应用", () => {
    expect(buildCustomSpeedRamp(clips, "clip-a", { peakSpeed: 1, fraction: 0.4 })).toEqual({
      error: "自定义峰值速度不能等于 1x",
    });
  });

  it("找不到片段或非视频片段时给出明确错误", () => {
    expect(buildSpeedRamp(clips, "missing", "slow")).toEqual({
      error: "找不到要变速的片段",
    });
    expect(
      buildSpeedRamp(
        [{ id: "audio", name: "音乐", start: 0, duration: 5, kind: "audio", tone: "music" }],
        "audio",
        "slow",
      ),
    ).toEqual({ error: "速度斜坡只支持视频片段" });
  });
});
