import { describe, expect, it } from "vitest";
import type { Asset, RenderSettings, Track } from "../data";
import { buildRenderRequest } from "./renderRequest";
import { createFixtureProject } from "./testFixtures";

const assets: Asset[] = [
  { id: "asset-01", name: "a.mp4", meta: "", duration: "00:10", kind: "video", tone: "sunset", tag: "本地视频", path: "C:\\media\\a.mp4" },
  { id: "asset-02", name: "b.mp4", meta: "", duration: "00:10", kind: "video", tone: "portrait", tag: "本地视频", path: "C:\\media\\b.mp4" },
  { id: "asset-03", name: "c.mp4", meta: "", duration: "00:10", kind: "video", tone: "wave", tag: "本地视频", path: "C:\\media\\c.mp4" },
  { id: "asset-04", name: "d.mp4", meta: "", duration: "00:10", kind: "video", tone: "rock", tag: "本地视频", path: "C:\\media\\d.mp4" },
  { id: "asset-05", name: "e.m4a", meta: "", duration: "01:00", kind: "audio", tone: "music", tag: "本地音频", path: "C:\\media\\e.m4a" },
  { id: "asset-06", name: "still.png", meta: "", duration: "00:05", kind: "video", tone: "wave", tag: "本地图片", path: "C:\\media\\still.png", isImage: true },
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

function createProject() {
  const project = createFixtureProject();
  for (const track of project.tracks) {
    track.clips = track.clips.filter((clip) => clip.kind === "text" || clip.assetId);
  }
  return project;
}

describe("buildRenderRequest", () => {
  it("把导出范围裁剪到片段可见部分", () => {
    const request = buildRenderRequest(createProject(), assets, {
      ...settings,
      rangeStart: 2,
      rangeEnd: 8,
    });
    const first = request.videoClips[0];
    expect(request.duration).toBe(6);
    expect(first.start).toBe(0);
    expect(first.duration).toBe(6);
    expect(first.sourceIn).toBe(2);
  });

  it("按轨道层级从下到上排列视频，最上层后叠加", () => {
    const project = createProject();
    const overlay: Track = {
      id: "track-v3",
      name: "V3",
      role: "视频轨道",
      kind: "video",
      height: 52,
      clips: [
        { id: "clip-overlay", name: "叠化素材", start: 0, duration: 5, kind: "video", tone: "cool", assetId: "asset-02" },
      ],
    };
    project.tracks.splice(1, 0, overlay);
    const request = buildRenderRequest(project, assets, settings);
    const overlayIndex = request.videoClips.findIndex(
      (clip) => clip.path === "C:\\media\\b.mp4" && clip.start === 0,
    );
    const baseIndex = request.videoClips.findIndex(
      (clip) => clip.path === "C:\\media\\a.mp4",
    );
    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(overlayIndex).toBeGreaterThan(baseIndex);
  });

  it("关闭字幕烧录后只移除字幕，标题和贴纸保留", () => {
    const project = createProject();
    project.tracks[0].clips[0].textRole = "caption";
    const withText = buildRenderRequest(project, assets, settings);
    expect(withText.textClips).toHaveLength(2);
    const withoutText = buildRenderRequest(project, assets, {
      ...settings,
      burnSubtitles: false,
    });
    expect(withoutText.textClips).toHaveLength(1);
    expect(withoutText.textClips[0].text).toBe("BETWEEN TIDES");
  });

  it("把转场换算成边缘淡化，并区分黑白", () => {
    const project = createProject();
    const clip = project.tracks[1].clips[0];
    clip.transitionIn = { type: "flash", duration: 0.4 };
    clip.transitionOut = { type: "fade", duration: 0.6 };
    const request = buildRenderRequest(project, assets, settings);
    const rendered = request.videoClips.find((item) => item.path === "C:\\media\\a.mp4");
    expect(rendered?.fadeIn).toBeCloseTo(0.4, 3);
    expect(rendered?.fadeInColor).toBe("white");
    expect(rendered?.fadeOut).toBeCloseTo(0.6, 3);
    expect(rendered?.fadeOutColor).toBe("black");
  });

  it("传递缩放、旋转与变速参数", () => {
    const project = createProject();
    const clip = project.tracks[1].clips[0];
    clip.scale = 1.4;
    clip.rotation = 12;
    clip.speed = 2;
    clip.sourceIn = 1;
    const request = buildRenderRequest(project, assets, settings);
    const rendered = request.videoClips.find((item) => item.start === 0);
    expect(rendered?.scale).toBe(1.4);
    expect(rendered?.rotation).toBe(12);
    expect(rendered?.speed).toBe(2);
    expect(rendered?.sourceIn).toBe(1);
    expect(rendered?.duration).toBeCloseTo(8.2, 3);
  });

  it("导出范围从片段中间开始时偏移关键帧时间", () => {
    const project = createProject();
    const clip = project.tracks[1].clips.find((item) => item.id === "clip-01")!;
    clip.keyframes = [
      { id: "kf-1", property: "opacity", time: 1, value: 0.2, easing: "linear" },
      { id: "kf-2", property: "opacity", time: 4, value: 1, easing: "linear" },
    ];
    const request = buildRenderRequest(project, assets, {
      ...settings,
      rangeStart: 2,
      rangeEnd: 8,
    });
    const rendered = request.videoClips.find(
      (item) => item.path === "C:\\media\\a.mp4" && item.start === 0,
    );
    expect(rendered?.keyframes.map((keyframe) => keyframe.time)).toEqual([0, 2]);
    expect(rendered?.keyframes[0].value).toBe(0.2);
  });

  it("纯文字工程也能构建导出请求", () => {
    const project = createProject();
    project.tracks = project.tracks.filter((track) => track.kind === "text");
    const request = buildRenderRequest(project, assets, {
      ...settings,
      rangeStart: 0,
      rangeEnd: 58,
    });
    expect(request.videoClips).toHaveLength(0);
    expect(request.audioClips).toHaveLength(0);
    expect(request.textClips).toHaveLength(2);
  });

  it("素材缺少本地路径时给出明确错误", () => {
    expect(() => buildRenderRequest(createProject(), [], settings)).toThrow(
      /缺少本地文件路径/,
    );
  });

  it("文本字号、颜色与位置传入导出参数", () => {
    const project = createProject();
    const title = project.tracks
      .flatMap((track) => track.clips)
      .find((clip) => clip.kind === "text");
    expect(title).toBeTruthy();
    title!.textStyle = { size: 1.6, color: "yellow", position: "top" };
    const request = buildRenderRequest(project, assets, settings);
    const rendered = request.textClips.find((item) => item.text === title!.text);
    expect(rendered?.fontSize).toBe(Math.round(720 * 0.05 * 1.6));
    expect(rendered?.color).toBe("yellow");
    expect(rendered?.position).toBe("top");
  });

  it("图片素材标记为静帧输入", () => {
    const project = createProject();
    project.tracks[1].clips.push({
      id: "clip-image",
      name: "still.png",
      start: 20,
      duration: 4,
      kind: "video",
      tone: "wave",
      assetId: "asset-06",
    });
    const request = buildRenderRequest(project, assets, settings);
    const rendered = request.videoClips.find((item) => item.path === "C:\\media\\still.png");
    expect(rendered?.image).toBe(true);
    expect(rendered?.duration).toBe(4);
  });

  it("降噪与响度归一化开关传入导出参数", () => {
    const project = createProject();
    const audioTrack = project.tracks.find(
      (track) => track.kind === "audio" && track.clips.length > 0,
    );
    expect(audioTrack).toBeTruthy();
    const clip = audioTrack!.clips[0];
    clip.denoise = true;
    clip.normalized = true;
    const request = buildRenderRequest(project, assets, settings);
    const rendered = request.audioClips.find((item) => item.path === "C:\\media\\e.m4a");
    expect(rendered?.denoise).toBe(true);
    expect(rendered?.normalized).toBe(true);
  });

  it("静音轨道或片段不会进入导出音轨", () => {
    const project = createProject();
    const audioTrack = project.tracks.find((track) => track.kind === "audio" && track.clips.length > 0);
    expect(audioTrack).toBeTruthy();
    audioTrack!.muted = true;
    const request = buildRenderRequest(project, assets, settings);
    expect(request.audioClips.length).toBe(0);
  });

  it("竖屏分辨率会启用居中裁切避免黑边", () => {
    const vertical = buildRenderRequest(createProject(), assets, {
      ...settings,
      width: 1080,
      height: 1920,
    });
    expect(vertical.vertical).toBe(true);
    expect(buildRenderRequest(createProject(), assets, settings).vertical).toBe(false);
  });
});
