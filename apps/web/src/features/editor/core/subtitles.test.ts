import { describe, expect, it } from "vitest";
import { parseSrt } from "./subtitles";

describe("parseSrt", () => {
  it("解析标准 SRT 条目", () => {
    const cues = parseSrt(`1
00:00:01,000 --> 00:00:03,500
第一句字幕

2
00:00:04,000 --> 00:00:06,250
第二句字幕`);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({ start: 1, end: 3.5, text: "第一句字幕" });
    expect(cues[1].start).toBe(4);
    expect(cues[1].end).toBeCloseTo(6.25, 3);
  });

  it("支持多行文本、HTML 标签与 BOM", () => {
    const cues = parseSrt(`\uFEFF1
00:00:02,000 --> 00:00:05,000
<i>第一行</i>
第二行
`);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("第一行\n第二行");
    expect(cues[0].start).toBe(2);
  });

  it("忽略无效条目并按时间排序", () => {
    const cues = parseSrt(`WEBVTT

00:00:08.000 --> 00:00:09.000
后出现

1
00:00:01,000 --> 00:00:02,000
先出现

2
00:00:03,000 --> invalid
坏数据`);
    expect(cues.map((cue) => cue.text)).toEqual(["先出现", "后出现"]);
  });
});
