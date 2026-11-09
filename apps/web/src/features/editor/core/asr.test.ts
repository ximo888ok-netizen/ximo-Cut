import { describe, expect, it } from "vitest";
import { normalizeCues, toSimplified } from "./asr";

describe("toSimplified", () => {
  it("把繁体转成简体", () => {
    expect(toSimplified("歡迎使用新剪輯軟件")).toBe("欢迎使用新剪辑软件");
    expect(toSimplified("今天我們來剪一條短視頻")).toBe("今天我们来剪一条短视频");
  });
});

describe("normalizeCues", () => {
  it("保留短句并按原时间输出", () => {
    const cues = normalizeCues([
      { start: 0, end: 1.5, text: " 大家好 " },
      { start: 1.5, end: 3, text: "今天讲讲剪辑" },
    ]);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({ start: 0, end: 1.5, text: "大家好" });
    expect(cues[1].text).toBe("今天讲讲剪辑");
  });

  it("把长句按标点和长度拆成多条字幕", () => {
    const cues = normalizeCues([
      {
        start: 0,
        end: 10,
        text: "这是一段非常非常长的字幕内容，用来验证自动换行与裁切行为，确保不会超出画面边界。",
      },
    ]);
    expect(cues.length).toBeGreaterThan(1);
    for (const cue of cues) {
      expect(cue.text.length).toBeLessThanOrEqual(21);
      expect(cue.end).toBeGreaterThan(cue.start);
    }
    expect(cues[0].start).toBe(0);
    expect(cues.at(-1)?.end).toBeLessThanOrEqual(10);
  });

  it("跳过空字幕和时间非法项", () => {
    expect(
      normalizeCues([
        { start: 0, end: 1, text: "   " },
        { start: Number.NaN, end: 1, text: "坏时间" },
      ]),
    ).toHaveLength(0);
  });
});
