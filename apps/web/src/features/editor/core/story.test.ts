import { describe, expect, it } from "vitest";
import type { FootageAnalysis } from "./review";
import { buildStoryPlan, STORY_STYLES } from "./story";

function analysis(assetId: string, name: string, shots: Array<[number, number, number]>): FootageAnalysis {
  return {
    assetId,
    name,
    duration: 20,
    scenes: [],
    silences: [],
    shots: shots.map(([start, end, score]) => ({
      start,
      end,
      score,
      blur: 1,
      brightness: 0.5,
    })),
  };
}

describe("buildStoryPlan", () => {
  const footage = [
    analysis("a1", "海边.mp4", [
      [0, 3, 92],
      [4, 8, 71],
      [9, 13, 55],
    ]),
    analysis("a2", "城市.mp4", [
      [0, 2.5, 88],
      [3, 7, 64],
      [8, 12, 40],
    ]),
  ];

  it("按叙事节拍排列并套用风格调色", () => {
    const plan = buildStoryPlan(footage, { targetDuration: 12, style: "cinematic" });
    expect(plan.shots.length).toBeGreaterThanOrEqual(3);
    expect(plan.shots[0].beat).toBe("开场钩子");
    expect(plan.shots.at(-1)?.beat).toBe("收尾");
    expect(plan.shots.some((shot) => shot.beat === "高潮")).toBe(true);
    expect(plan.shots.every((shot) => shot.look === STORY_STYLES.cinematic.look)).toBe(true);
  });

  it("不连续使用同一素材，并过滤低质量镜头", () => {
    const plan = buildStoryPlan(footage, { targetDuration: 20, style: "vlog" });
    expect(plan.shots.length).toBeGreaterThanOrEqual(4);
    for (let index = 1; index < plan.shots.length; index += 1) {
      expect(plan.shots[index].assetId).not.toBe(plan.shots[index - 1].assetId);
    }
    expect(plan.shots.every((shot) => shot.score >= 30)).toBe(true);
  });

  it("高能风格使用更短镜头和闪光转场", () => {
    const plan = buildStoryPlan(footage, { targetDuration: 10, style: "energy" });
    expect(plan.styleLabel).toBe("高能卡点");
    expect(plan.shots.length).toBeGreaterThanOrEqual(6);
    expect(plan.shots.slice(1).every((shot) => shot.transition === "flash")).toBe(true);
  });

  it("没有可用镜头时返回空方案", () => {
    const plan = buildStoryPlan([analysis("a3", "糊片.mp4", [[0, 2, 5]])]);
    expect(plan.shots).toHaveLength(0);
    expect(plan.totalDuration).toBe(0);
  });
});
