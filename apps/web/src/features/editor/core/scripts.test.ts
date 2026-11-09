import { describe, expect, it } from "vitest";
import {
  createScript,
  emptyShot,
  normalizeScriptDoc,
  scriptDuration,
  scriptToSrt,
  shotTimeline,
} from "./scripts";
import { buildScriptClips } from "./scriptApply";
import type { Asset } from "../data";

const assets: Asset[] = [
  {
    id: "a1",
    name: "one.mp4",
    meta: "",
    duration: "00:04",
    kind: "video",
    tone: "wave",
    tag: "本地视频",
    url: "http://asset.localhost/one.mp4",
  },
  {
    id: "a2",
    name: "two.mp4",
    meta: "",
    duration: "00:10",
    kind: "video",
    tone: "sunset",
    tag: "本地视频",
    url: "http://asset.localhost/two.mp4",
  },
];

describe("分镜脚本", () => {
  it("按镜头时长累加时间线并计算总长", () => {
    const doc = createScript("测试");
    doc.shots = [
      { ...emptyShot(0), duration: 2 },
      { ...emptyShot(1), duration: 3.5 },
    ];
    expect(scriptDuration(doc)).toBe(5.5);
    expect(shotTimeline(doc).map((item) => item.start)).toEqual([0, 2]);
  });

  it("解析脚本时补全缺失字段并丢弃无效镜头", () => {
    const doc = normalizeScriptDoc(
      {
        format: "ximo-cut-script",
        title: "口播脚本",
        shots: [
          { duration: 4, description: "开场" },
          { duration: 0, description: "坏镜头" },
          { duration: 2.5, dialogue: "你好", shotSize: "特写" },
        ],
      },
      "script-x",
    );
    expect(doc?.title).toBe("口播脚本");
    expect(doc?.shots).toHaveLength(2);
    expect(doc?.shots[0].shotSize).toBe("中景");
    expect(doc?.shots[1].dialogue).toBe("你好");
    expect(normalizeScriptDoc({ shots: [] }, "s")).toBeNull();
    expect(normalizeScriptDoc({ format: "other", shots: [{ duration: 1 }] }, "s")).toBeNull();
  });

  it("台词导出为标准 SRT", () => {
    const doc = createScript("字幕");
    doc.shots = [
      { ...emptyShot(0), duration: 2.5, dialogue: "第一句" },
      { ...emptyShot(1), duration: 3, dialogue: "" },
      { ...emptyShot(2), duration: 1.5, dialogue: "第二句" },
    ];
    const srt = scriptToSrt(doc);
    expect(srt).toContain("00:00:00,000 --> 00:00:02,500");
    expect(srt).toContain("第一句");
    expect(srt).toContain("00:00:05,500 --> 00:00:07,000");
    expect(srt.trim().split("\n\n")).toHaveLength(2);
  });

  it("套用到时间线时按素材长度裁剪并生成字幕轨", () => {
    const doc = createScript("套用");
    doc.shots = [
      { ...emptyShot(0), duration: 6, dialogue: "开场白" },
      { ...emptyShot(1), duration: 3, dialogue: "" },
    ];
    const result = buildScriptClips(doc, assets);
    expect(result.videoClips).toHaveLength(2);
    expect(result.videoClips[0].duration).toBe(4);
    expect(result.videoClips[0].assetId).toBe("a1");
    expect(result.videoClips[1].start).toBe(4);
    expect(result.trimmedShots).toBe(1);
    expect(result.textClips).toHaveLength(1);
    expect(result.textClips[0].text).toBe("开场白");
  });

  it("套用时把景别和转场写进片段", () => {
    const doc = createScript("景别");
    doc.shots = [
      { ...emptyShot(0), duration: 2, shotSize: "特写", transition: "淡入" },
      { ...emptyShot(1), duration: 2, shotSize: "中景", transition: "硬切" },
    ];
    const result = buildScriptClips(doc, assets);
    expect(result.videoClips[0].scale).toBe(1.25);
    expect(result.videoClips[0].transitionIn).toEqual({ type: "fade", duration: 0.5 });
    expect(result.videoClips[1].scale).toBeUndefined();
    expect(result.videoClips[1].transitionIn).toBeUndefined();
  });

  it("没有素材时只生成占位画面，不产生字幕错位", () => {
    const doc = createScript("空素材");
    doc.shots = [{ ...emptyShot(0), duration: 2, dialogue: "台词" }];
    const result = buildScriptClips(doc, []);
    expect(result.videoClips[0].assetId).toBeUndefined();
    expect(result.videoClips[0].duration).toBe(2);
    expect(result.textClips[0].start).toBe(0);
  });
});
