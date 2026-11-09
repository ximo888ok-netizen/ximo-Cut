import { describe, expect, it } from "vitest";
import { formatTimecode } from "../data";
import { EditorStore, planShotsToClips } from "./editorStore";
import { createFixtureProject, fixturePlanShots } from "./testFixtures";

function createStore() {
  return new EditorStore(createFixtureProject());
}

describe("EditorStore", () => {
  it("formats timecode without frame drift", () => {
    expect(formatTimecode(18.4, 30)).toBe("00:00:18:12");
  });

  it("moves a clip within its track", () => {
    const store = createStore();
    const result = store.execute({ type: "clip.move", clipId: "clip-music", start: 2 });
    expect(result.ok).toBe(true);
    const clip = store.getSnapshot().tracks
      .flatMap((track) => track.clips)
      .find((item) => item.id === "clip-music");
    expect(clip?.start).toBe(2);
  });

  it("trims a clip from the end", () => {
    const store = createStore();
    const result = store.execute({
      type: "clip.trim",
      clipId: "clip-02",
      edge: "end",
      delta: -1,
    });
    expect(result.ok).toBe(true);
    const clip = store.getSnapshot().tracks
      .flatMap((track) => track.clips)
      .find((item) => item.id === "clip-02");
    expect(clip?.duration).toBeCloseTo(9.1, 3);
  });

  it("起点裁剪按变速倍率前移源素材入点", () => {
    const project = createFixtureProject();
    const clip = project.tracks[1].clips.find((item) => item.id === "clip-02")!;
    clip.speed = 2;
    clip.sourceIn = 1;
    clip.duration = 4;
    const store = new EditorStore(project);
    const result = store.execute({
      type: "clip.trim",
      clipId: "clip-02",
      edge: "start",
      delta: 1,
    });
    expect(result.ok).toBe(true);
    const updated = store.getSnapshot().tracks
      .flatMap((track) => track.clips)
      .find((item) => item.id === "clip-02");
    expect(updated?.sourceIn).toBeCloseTo(3, 3);
    expect(updated?.duration).toBeCloseTo(3, 3);
  });

  it("结束裁剪不会超过素材剩余长度", () => {
    const store = createStore();
    const result = store.execute({
      type: "clip.trim",
      clipId: "clip-06",
      edge: "end",
      delta: 10,
      maxDuration: 8,
    });
    expect(result.ok).toBe(true);
    const clip = store.getSnapshot().tracks
      .flatMap((track) => track.clips)
      .find((item) => item.id === "clip-06");
    expect(clip?.duration).toBeCloseTo(8, 3);
  });

  it("连续滑杆修改合并为一步撤销", () => {
    const store = createStore();
    const key = "opacity:clip-01";
    store.execute({ type: "clip.update", clipId: "clip-01", patch: { opacity: 0.9 } }, { coalesceKey: key });
    store.execute({ type: "clip.update", clipId: "clip-01", patch: { opacity: 0.8 } }, { coalesceKey: key });
    store.execute({ type: "clip.update", clipId: "clip-01", patch: { opacity: 0.7 } }, { coalesceKey: key });
    const current = store.getSnapshot().tracks
      .flatMap((track) => track.clips)
      .find((item) => item.id === "clip-01");
    expect(current?.opacity).toBe(0.7);
    store.undo();
    const restored = store.getSnapshot().tracks
      .flatMap((track) => track.clips)
      .find((item) => item.id === "clip-01");
    expect(restored?.opacity).toBeUndefined();
  });

  it("组合多个片段并支持取消组合", () => {
    const store = createStore();
    const grouped = store.execute({
      type: "clip.group",
      clipIds: ["clip-01", "clip-02"],
      groupId: "group-test",
    });
    expect(grouped.ok).toBe(true);
    const clips = () => store.getSnapshot().tracks.flatMap((track) => track.clips);
    expect(clips().find((clip) => clip.id === "clip-01")?.groupId).toBe("group-test");
    expect(clips().find((clip) => clip.id === "clip-02")?.groupId).toBe("group-test");
    store.execute({
      type: "clip.group",
      clipIds: ["clip-01", "clip-02"],
      groupId: null,
    });
    expect(clips().find((clip) => clip.id === "clip-01")?.groupId).toBeUndefined();
    expect(clips().find((clip) => clip.id === "clip-02")?.groupId).toBeUndefined();
  });

  it("splits a clip into two", () => {
    const store = createStore();
    const before = store.getSnapshot().tracks[1].clips.length;
    const result = store.execute({ type: "clip.split", clipId: "clip-03", at: 24 });
    expect(result.ok).toBe(true);
    const clips = store.getSnapshot().tracks[1].clips;
    expect(clips.length).toBe(before + 1);
    expect(clips.some((clip) => clip.name.includes("A"))).toBe(true);
    expect(clips.some((clip) => clip.name.includes("B"))).toBe(true);
  });

  it("ripple deletes a clip and closes the gap", () => {
    const store = createStore();
    const result = store.execute({
      type: "clip.delete",
      clipId: "clip-03",
      ripple: true,
    });
    expect(result.ok).toBe(true);
    const clips = store.getSnapshot().tracks[1].clips;
    expect(clips.length).toBe(5);
    const next = clips.find((clip) => clip.id === "clip-04");
    expect(next?.start).toBeCloseTo(18.3, 3);
  });

  it("applies the AI plan to V1", () => {
    const store = createStore();
    const result = store.execute({
      type: "track.replace",
      trackId: "track-v1",
      clips: planShotsToClips(fixturePlanShots),
    });
    expect(result.ok).toBe(true);
    const clips = store.getSnapshot().tracks[1].clips;
    expect(clips.length).toBe(4);
    expect(clips[0].start).toBe(0);
    expect(clips[3].duration).toBeCloseTo(16, 3);
  });

  it("inserts a clip into an empty region", () => {
    const store = createStore();
    const before = store.getSnapshot().tracks[0].clips.length;
    const result = store.execute({
      type: "clip.insert",
      trackId: "track-v2",
      clip: {
        id: "clip-test",
        name: "测试标题",
        start: 10,
        duration: 2,
        kind: "text",
        tone: "title",
      },
    });
    expect(result.ok).toBe(true);
    expect(store.getSnapshot().tracks[0].clips.length).toBe(before + 1);
  });

  it("rejects an overlapping insert", () => {
    const store = createStore();
    const result = store.execute({
      type: "clip.insert",
      trackId: "track-v1",
      clip: {
        id: "clip-overlap",
        name: "重叠片段",
        start: 2,
        duration: 4,
        kind: "video",
        tone: "wave",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("已有片段");
  });

  it("changes speed and duration together", () => {
    const store = createStore();
    const result = store.execute({ type: "clip.speed", clipId: "clip-02", speed: 2 });
    expect(result.ok).toBe(true);
    const clip = store.getSnapshot().tracks[1].clips.find((item) => item.id === "clip-02");
    expect(clip?.speed).toBe(2);
    expect(clip?.duration).toBeCloseTo(5.05, 2);
  });

  it("adds transitions, keyframes and markers", () => {
    const store = createStore();
    expect(
      store.execute({
        type: "clip.transition",
        clipId: "clip-02",
        edge: "in",
        transition: { type: "fade", duration: 0.5 },
      }).ok,
    ).toBe(true);
    expect(
      store.execute({
        type: "clip.keyframe",
        clipId: "clip-02",
        keyframe: { id: "kf-1", property: "opacity", time: 1, value: 1 },
      }).ok,
    ).toBe(true);
    expect(store.execute({ type: "marker.add", time: 20, label: "测试标记" }).ok).toBe(true);

    const project = store.getSnapshot();
    const clip = project.tracks[1].clips.find((item) => item.id === "clip-02");
    expect(clip?.transitionIn?.duration).toBe(0.5);
    expect(clip?.keyframes).toHaveLength(1);
    expect(project.markers.some((marker) => marker.label === "测试标记")).toBe(true);
  });

  it("同一时间同一属性的关键帧会替换并可删除", () => {
    const store = createStore();
    store.execute({
      type: "clip.keyframe",
      clipId: "clip-02",
      keyframe: { id: "kf-a", property: "scale", time: 1, value: 1 },
    });
    store.execute({
      type: "clip.keyframe",
      clipId: "clip-02",
      keyframe: { id: "kf-b", property: "scale", time: 1, value: 1.5 },
    });
    let clip = store
      .getSnapshot()
      .tracks[1].clips.find((item) => item.id === "clip-02");
    expect(clip?.keyframes).toHaveLength(1);
    expect(clip?.keyframes?.[0].value).toBe(1.5);

    store.execute({ type: "clip.keyframeRemove", clipId: "clip-02", keyframeId: "kf-b" });
    clip = store.getSnapshot().tracks[1].clips.find((item) => item.id === "clip-02");
    expect(clip?.keyframes).toHaveLength(0);
  });

  it("updates audio properties, groups clips and removes markers", () => {
    const store = createStore();
    expect(
      store.execute({
        type: "clip.update",
        clipId: "clip-02",
        patch: {
          volumeDb: -18,
          fadeIn: 0.5,
          fadeOut: 0.4,
          normalized: true,
          eq: { low: 1, mid: 2, high: -1 },
          syncOffset: 0.05,
        },
      }).ok,
    ).toBe(true);
    expect(
      store.execute({ type: "clip.group", clipIds: ["clip-02", "clip-03"], groupId: "group-1" }).ok,
    ).toBe(true);
    const clip = store.getSnapshot().tracks[1].clips.find((item) => item.id === "clip-02");
    expect(clip?.volumeDb).toBe(-18);
    expect(clip?.fadeIn).toBe(0.5);
    expect(clip?.normalized).toBe(true);
    expect(clip?.groupId).toBe("group-1");

    const markerId = store.getSnapshot().markers[0].id;
    expect(store.execute({ type: "marker.remove", markerId }).ok).toBe(true);
    expect(store.getSnapshot().markers.some((marker) => marker.id === markerId)).toBe(false);
  });

  it("stores filter and color adjustment on a clip", () => {
    const store = createStore();
    expect(
      store.execute({
        type: "clip.update",
        clipId: "clip-02",
        patch: {
          filter: "saturate(1.12) hue-rotate(10deg)",
          adjust: { brightness: 22, contrast: 12, saturation: 8, temperature: -10 },
        },
      }).ok,
    ).toBe(true);
    const clip = store.getSnapshot().tracks[1].clips.find((item) => item.id === "clip-02");
    expect(clip?.filter).toContain("saturate");
    expect(clip?.adjust?.brightness).toBe(22);
    expect(clip?.adjust?.temperature).toBe(-10);
  });

  it("duplicates a clip when there is space", () => {
    const store = createStore();
    const before = store.getSnapshot().tracks[0].clips.length;
    expect(store.execute({ type: "clip.duplicate", clipId: "clip-title" }).ok).toBe(true);
    expect(store.getSnapshot().tracks[0].clips.length).toBe(before + 1);
  });

  it("undoes and redoes a command", () => {
    const store = createStore();
    const before = store.getSnapshot().tracks[1].clips.length;
    store.execute({ type: "clip.split", clipId: "clip-03", at: 24 });
    expect(store.getSnapshot().tracks[1].clips.length).toBe(before + 1);

    expect(store.undo().ok).toBe(true);
    expect(store.getSnapshot().tracks[1].clips.length).toBe(before);

    expect(store.redo().ok).toBe(true);
    expect(store.getSnapshot().tracks[1].clips.length).toBe(before + 1);
  });

  it("rejects overlapping moves", () => {
    const store = createStore();
    const result = store.execute({ type: "clip.move", clipId: "clip-02", start: 0 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("重叠");
  });

  it("splits a sped-up clip with the correct source offset", () => {
    const store = createStore();
    expect(store.execute({ type: "clip.speed", clipId: "clip-03", speed: 2 }).ok).toBe(true);
    const before = store.getSnapshot().tracks[1].clips.find((item) => item.id === "clip-03");
    expect(before?.start).toBeCloseTo(18.3, 3);
    expect(store.execute({ type: "clip.split", clipId: "clip-03", at: 20.3 }).ok).toBe(true);
    const clips = store.getSnapshot().tracks[1].clips;
    const right = clips.find((clip) => clip.start > 20 && clip.start < 20.4);
    expect(right?.sourceIn).toBeCloseTo(4, 3);
  });

  it("extends the timeline when a long clip is inserted", () => {
    const store = createStore();
    expect(
      store.execute({
        type: "track.insertClip",
        kind: "video",
        clip: {
          id: "clip-long",
          name: "长视频",
          start: 0,
          duration: 320,
          kind: "video",
          tone: "wave",
        },
      }).ok,
    ).toBe(true);
    expect(store.getSnapshot().duration).toBeGreaterThanOrEqual(320);
    expect(store.getSnapshot().duration % 30).toBe(0);
  });

  it("places new video tracks above the main video track", () => {
    const store = createStore();
    expect(store.execute({ type: "track.add", kind: "video" }).ok).toBe(true);
    const tracks = store.getSnapshot().tracks;
    expect(tracks[0].id).toBe("track-v2");
    expect(tracks[1].kind).toBe("video");
    expect(tracks[1].id).not.toBe("track-v1");
    expect(tracks[2].id).toBe("track-v1");
  });
});
