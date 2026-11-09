import { describe, expect, it } from "vitest";
import { parseReplicaScript } from "./qwenVision";

describe("视频复刻脚本解析", () => {
  it("解析带代码块的模型输出", () => {
    const text = `好的，脚本如下：
\`\`\`json
{"title":"城市夜色","shots":[
  {"duration":3,"shotSize":"全景","description":"霓虹街景推进","dialogue":"","transition":"推拉"},
  {"duration":2.5,"shotSize":"特写","description":"咖啡杯冒热气","dialogue":"夜色刚刚开始","transition":"硬切"}
]}
\`\`\``;
    const doc = parseReplicaScript(text, {
      fileName: "ref.mp4",
      duration: 6,
      coverPath: "C:\\frames\\0.jpg",
    });
    expect(doc.title).toBe("城市夜色");
    expect(doc.source).toBe("replica");
    expect(doc.referenceDuration).toBe(6);
    expect(doc.coverPath).toBe("C:\\frames\\0.jpg");
    expect(doc.shots).toHaveLength(2);
    expect(doc.shots[1].dialogue).toBe("夜色刚刚开始");
    expect(doc.shots[0].transition).toBe("推拉");
  });

  it("缺失时长时按视频总长平均分配", () => {
    const doc = parseReplicaScript(
      '{"shots":[{"description":"a"},{"description":"b"}]}',
      { fileName: "ref.mp4", duration: 10 },
    );
    expect(doc.shots.map((shot) => shot.duration)).toEqual([5, 5]);
    expect(doc.title).toContain("ref");
  });

  it("无有效镜头或非法 JSON 时抛出中文错误", () => {
    expect(() => parseReplicaScript("这里没有 JSON", { fileName: "a.mp4", duration: 5 })).toThrow(
      /不是有效分镜脚本/,
    );
    expect(() =>
      parseReplicaScript('{"shots":[]}', { fileName: "a.mp4", duration: 5 }),
    ).toThrow(/有效镜头/);
  });
});
