import { describe, expect, it } from "vitest";
import type { TrackClip } from "../data";
import { clipTransformAt, evaluateProperty } from "./keyframes";

const clip: TrackClip = {
  id: "clip-test",
  name: "测试",
  start: 0,
  duration: 10,
  kind: "video",
  tone: "wave",
  scale: 1,
  keyframes: [
    { id: "k1", property: "scale", time: 0, value: 1, easing: "linear" },
    { id: "k2", property: "scale", time: 2, value: 2, easing: "linear" },
    { id: "k3", property: "opacity", time: 0, value: 0, easing: "easeIn" },
    { id: "k4", property: "opacity", time: 1, value: 1, easing: "easeIn" },
    { id: "k5", property: "positionX", time: 0, value: 0, easing: "hold" },
    { id: "k6", property: "positionX", time: 4, value: 50, easing: "hold" },
  ],
};

describe("evaluateProperty", () => {
  it("按时间线性插值", () => {
    expect(evaluateProperty(clip, "scale", 0, 1)).toBe(1);
    expect(evaluateProperty(clip, "scale", 1, 1)).toBe(1.5);
    expect(evaluateProperty(clip, "scale", 2, 1)).toBe(2);
  });

  it("支持缓入曲线", () => {
    expect(evaluateProperty(clip, "opacity", 0.5, 1)).toBeCloseTo(0.25, 4);
  });

  it("支持保持型关键帧", () => {
    expect(evaluateProperty(clip, "positionX", 3.9, 0)).toBe(0);
    expect(evaluateProperty(clip, "positionX", 4, 0)).toBe(50);
  });

  it("没有关键帧时返回静态值", () => {
    expect(evaluateProperty({ ...clip, keyframes: [] }, "scale", 1, 1.2)).toBe(1.2);
  });

  it("超出首尾关键帧时保持端点值", () => {
    expect(evaluateProperty(clip, "scale", -1, 1)).toBe(1);
    expect(evaluateProperty(clip, "scale", 20, 1)).toBe(2);
  });
});

describe("clipTransformAt", () => {
  it("一次算出完整的画面变换", () => {
    expect(clipTransformAt(clip, 1)).toEqual({
      scale: 1.5,
      rotation: 0,
      opacity: 1,
      positionX: 0,
      positionY: 0,
    });
  });
});
