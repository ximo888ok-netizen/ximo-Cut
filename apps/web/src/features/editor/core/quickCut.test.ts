import { describe, expect, it } from "vitest";
import {
  mapCuesToTimeline,
  planQuickCut,
  silentRatio,
  snapToBeat,
  splitShots,
  totalDuration,
  trimEdges,
} from "./quickCut";

const material = {
  assetId: "asset-a",
  duration: 10,
  scenes: [3, 6.5],
  silences: [
    { start: 0, end: 1.2 },
    { start: 2.8, end: 3.4 },
    { start: 9.2, end: 10 },
  ],
};

describe("trimEdges", () => {
  it("裁掉开头与结尾的静音并保留气口", () => {
    const trimmed = trimEdges(0, 3, material.silences);
    expect(trimmed).not.toBeNull();
    expect(trimmed!.start).toBeCloseTo(1.08, 3);
    expect(trimmed!.end).toBeCloseTo(2.92, 3);
  });

  it("整段都是静音时返回 null", () => {
    expect(trimEdges(9.2, 10, material.silences)).toBeNull();
  });
});

describe("silentRatio", () => {
  it("统计区间内静音占比", () => {
    expect(silentRatio(0, 2, material.silences)).toBeCloseTo(0.6, 2);
    expect(silentRatio(4, 6, material.silences)).toBe(0);
  });
});

describe("splitShots", () => {
  it("按场景切分并裁掉首尾停顿", () => {
    const shots = splitShots(material, { targetDuration: 30 });
    expect(shots.length).toBe(3);
    expect(shots[0].sourceIn).toBeCloseTo(1.08, 2);
    expect(shots[0].duration).toBeLessThan(2);
  });

  it("过长的镜头会被拆成多个选段", () => {
    const shots = splitShots(
      { assetId: "a", duration: 20, scenes: [], silences: [] },
      { targetDuration: 30, maxShot: 4 },
    );
    expect(shots.length).toBe(5);
    expect(Math.max(...shots.map((shot) => shot.duration))).toBeLessThanOrEqual(4);
  });

  it("图片素材生成固定静帧镜头", () => {
    const shots = splitShots(
      { assetId: "img", duration: 5, scenes: [], silences: [], still: true },
      { targetDuration: 30 },
    );
    expect(shots).toEqual([
      { assetId: "img", sourceIn: 0, duration: 3, speech: false },
    ]);
  });
});

describe("snapToBeat", () => {
  it("把时长对齐到整拍", () => {
    expect(snapToBeat(2.3, 0.5)).toBe(2);
    expect(snapToBeat(0.4, 0.5)).toBe(0.5);
    expect(snapToBeat(9, 0.5)).toBe(8);
  });

  it("没有节拍信息时保持原值", () => {
    expect(snapToBeat(2.34, 0)).toBe(2.34);
  });
});

describe("planQuickCut", () => {
  it("优先选择有说话的镜头并控制总时长", () => {
    const shots = planQuickCut(
      [
        material,
        {
          assetId: "asset-b",
          duration: 8,
          scenes: [2, 5],
          silences: [{ start: 2, end: 8 }],
        },
      ],
      { targetDuration: 8, bpm: 120 },
    );
    expect(shots.length).toBeGreaterThanOrEqual(3);
    expect(totalDuration(shots)).toBeLessThan(10);
    expect(shots[0].assetId).toBe("asset-a");
    expect(shots.every((shot) => shot.duration % 0.5 === 0)).toBe(true);
  });

  it("素材为空时返回空计划", () => {
    expect(planQuickCut([], { targetDuration: 30 })).toEqual([]);
  });
});

describe("mapCuesToTimeline", () => {
  it("把拼接音轨时间映射回时间线", () => {
    const mapped = mapCuesToTimeline(
      [
        { start: 0.2, end: 1.2, text: "第一句" },
        { start: 3.1, end: 4.0, text: "第二句" },
        { start: 9.9, end: 10.5, text: "超出范围" },
      ],
      [
        { start: 0, duration: 3, sourceStart: 0 },
        { start: 3, duration: 4, sourceStart: 3 },
      ],
    );
    expect(mapped).toEqual([
      { start: 0.2, end: 1.2, text: "第一句" },
      { start: 3.1, end: 4, text: "第二句" },
    ]);
  });
});
