import { describe, expect, it } from "vitest";
import { buildDraftContents, buildDraftMeta, deriveDraftCover, formatDraftDuration, formatDraftTime } from "./drafts";
import { parseProjectFile } from "./desktop";
import { createFixtureProject } from "./testFixtures";
import type { Asset, RenderSettings } from "../data";

const assets: Asset[] = [
  {
    id: "asset-01",
    name: "a.mp4",
    meta: "",
    duration: "00:10",
    kind: "video",
    tone: "sunset",
    tag: "本地视频",
    path: "C:\\media\\a.mp4",
    thumbnail: "http://asset.localhost/thumb.png",
  },
];

const settings: RenderSettings = {
  width: 1280,
  height: 720,
  fps: 30,
  bitrate: "8 Mbps",
  format: "mp4",
  burnSubtitles: true,
  rangeStart: 0,
  rangeEnd: 60,
};

describe("草稿元数据", () => {
  it("从工程计算时长、片段数并选取封面", () => {
    const project = createFixtureProject();
    const meta = buildDraftMeta({
      id: "draft-1",
      name: "测试草稿",
      createdAt: "2026-01-01T00:00:00.000Z",
      project,
      assets,
    });
    expect(meta.duration).toBeGreaterThan(50);
    expect(meta.clipCount).toBeGreaterThan(0);
    expect(meta.cover).toBe("http://asset.localhost/thumb.png");
    expect(meta.tone).toBe("sunset");
  });

  it("没有可用封面时回退到色调", () => {
    const project = createFixtureProject();
    const result = deriveDraftCover(project, []);
    expect(result.cover).toBeUndefined();
    expect(result.tone).toBe("sunset");
  });

  it("草稿文件可被工程解析器读回", () => {
    const project = { ...createFixtureProject(), name: "周更 vlog" };
    const meta = buildDraftMeta({
      id: "draft-2",
      name: "周更 vlog",
      createdAt: "2026-01-01T00:00:00.000Z",
      project,
      assets,
    });
    const contents = buildDraftContents({
      meta,
      project,
      assets,
      renderSettings: settings,
      planShots: [],
    });
    const parsed = parseProjectFile(contents);
    expect(parsed.project.name).toBe("周更 vlog");
    expect(parsed.assets[0].thumbnail).toBe("http://asset.localhost/thumb.png");
    expect(JSON.parse(contents).draft.id).toBe("draft-2");
  });

  it("格式化时长与相对时间", () => {
    expect(formatDraftDuration(0)).toBe("00:00");
    expect(formatDraftDuration(65.4)).toBe("01:05");
    expect(formatDraftTime(new Date().toISOString())).toBe("刚刚");
    expect(formatDraftTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe("5 分钟前");
  });
});
