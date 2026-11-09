import type { EditCommand, EditorStore, ProjectState } from "./editorStore";
import { EditorStore as EditorStoreClass, planShotsToClips } from "./editorStore";
import { createFixtureProject, fixturePlanShots } from "./testFixtures";
import { buildRenderRequest, type RenderRequest } from "./renderRequest";
import { blockedAgentTarget } from "./agentGuard";
import {
  parseMediaDuration,
  type Asset,
  type BlendMode,
  type ClipMask,
  type Keyframe,
  type RenderSettings,
} from "../data";
import type { FootageAnalysis, ReviewReport } from "./review";
import { buildSpeedRamp, type SpeedRampPreset } from "./speedRamp";
import type { BuiltinSfx } from "./sfx";

export interface UiNode {
  id: string;
  role: string;
  label: string;
  actions: string[];
  disabled: boolean;
  visible: boolean;
}

export interface AgentActionResult {
  ok: boolean;
  message?: string;
  revision?: number;
}

export interface UiCoverageReport {
  total: number;
  registered: number;
  missing: Array<{ tag: string; label: string; className: string }>;
}

export interface SelfTestResult {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface SelfTestReport {
  passed: number;
  failed: number;
  results: SelfTestResult[];
  ui: UiCoverageReport;
}

export interface AgentUiContext {
  selectedClipId: string | null;
  selectedAssetId: string | null;
  activeTab: string;
  playhead: number;
  playing: boolean;
}

export interface AgentApprovalRequest {
  action: string;
  detail: string;
}

export interface QuickCutRequest {
  targetDuration?: number;
  captions?: boolean;
  music?: boolean;
  vertical?: boolean;
}

export interface ReviewTimelineResult {
  ok: boolean;
  path?: string;
  report?: ReviewReport;
  message?: string;
}

export interface AgentRuntime {
  getAudioAnalyses: () => unknown[];
  getAssets: () => Asset[];
  getPlayhead: () => number;
  isPlaying: () => boolean;
  getContext: () => AgentUiContext;
  requestApproval: (request: AgentApprovalRequest) => Promise<boolean>;
  transcribeCaptions: (assetId?: string) => Promise<AgentActionResult>;
  runQuickCut: (options?: QuickCutRequest) => Promise<AgentActionResult>;
  reviewTimeline: () => Promise<ReviewTimelineResult>;
  reviewVideo: (path: string) => Promise<ReviewReport>;
  analyzeFootage: () => Promise<FootageAnalysis[]>;
  listSfx: () => Promise<BuiltinSfx[]>;
  insertSfx: (effect: BuiltinSfx) => Promise<AgentActionResult>;
  speak: (text: string, rate?: number) => Promise<AgentActionResult>;
  seek: (time: number) => void;
  play: () => void;
  pause: () => void;
  getRenderSettings: () => RenderSettings;
  updateRenderSettings: (patch: Partial<RenderSettings>) => void;
  exportProject: (settings?: Partial<RenderSettings>) => Promise<AgentActionResult>;
  exportBatch: (jobs: Array<Partial<RenderSettings>>) => Promise<AgentActionResult>;
  proposePlan: (shots: ProposedShot[]) => AgentActionResult;
}

export interface ProposedShot {
  asset_id?: string;
  title: string;
  note?: string;
  duration: number;
  tone?: string;
  source_in?: number;
  speed?: number;
  transition?: "fade" | "flash";
  beat?: string;
  look?: string;
}

export interface XimoCutAgentApi {
  snapshot: () => {
    revision: number;
    screen: string;
    context: AgentUiContext;
    elements: UiNode[];
  };
  audit: () => UiCoverageReport;
  selfTest: () => SelfTestReport;
  click: (id: string) => AgentActionResult;
  setValue: (id: string, value: string | number | boolean) => AgentActionResult;
  execute: (command: EditCommand) => AgentActionResult;
  getProject: () => ProjectState;
  getAssets: () => Asset[];
  context: {
    getState: () => AgentUiContext;
  };
  requestApproval: (request: AgentApprovalRequest) => Promise<boolean>;
  plan: {
    propose: (shots: ProposedShot[]) => AgentActionResult;
  };
  audio: {
    getAnalyses: () => unknown[];
    listSfx: () => Promise<BuiltinSfx[]>;
    insertSfx: (effect: BuiltinSfx) => Promise<AgentActionResult>;
    speak: (text: string, rate?: number) => Promise<AgentActionResult>;
  };
  captions: {
    transcribe: (assetId?: string) => Promise<AgentActionResult>;
  };
  quickCut: {
    run: (options?: QuickCutRequest) => Promise<AgentActionResult>;
  };
  review: {
    timeline: () => Promise<ReviewTimelineResult>;
    video: (path: string) => Promise<ReviewReport>;
    footage: () => Promise<FootageAnalysis[]>;
  };
  preview: {
    seek: (time: number) => AgentActionResult;
    play: () => AgentActionResult;
    pause: () => AgentActionResult;
    getState: () => { playhead: number; playing: boolean };
  };
  render: {
    getSettings: () => RenderSettings;
    updateSettings: (patch: Partial<RenderSettings>) => AgentActionResult;
    buildRequest: (settings?: Partial<RenderSettings>) => RenderRequest;
    start: (settings?: Partial<RenderSettings>) => Promise<AgentActionResult>;
    batch: (jobs: Array<Partial<RenderSettings>>) => Promise<AgentActionResult>;
  };
  timeline: {
    dragClip: (clipId: string, start: number, trackId?: string) => AgentActionResult;
    trimClip: (clipId: string, edge: "start" | "end", delta: number) => AgentActionResult;
    splitClip: (clipId: string, at: number) => AgentActionResult;
    deleteClip: (clipId: string, ripple?: boolean) => AgentActionResult;
    duplicateClip: (clipId: string) => AgentActionResult;
    addTrack: (kind: "video" | "audio" | "text") => AgentActionResult;
    setTransform: (
      clipId: string,
      patch: { scale?: number; rotation?: number; opacity?: number; positionX?: number; positionY?: number },
    ) => AgentActionResult;
    addKeyframe: (clipId: string, keyframe: Keyframe) => AgentActionResult;
    removeKeyframe: (clipId: string, keyframeId: string) => AgentActionResult;
    setMask: (clipId: string, mask: ClipMask | null) => AgentActionResult;
    speedRamp: (clipId: string, preset: SpeedRampPreset) => AgentActionResult;
    setBlend: (clipId: string, mode: BlendMode) => AgentActionResult;
  };
}

declare global {
  interface Window {
    XimoCutAgent?: XimoCutAgentApi;
  }
}

export function installAgentApi(
  store: EditorStore,
  getRuntime: () => AgentRuntime,
): () => void {
  const api: XimoCutAgentApi = {
    snapshot: () => {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>("[data-agent-id]"),
      )
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth;
          return {
            id: element.dataset.agentId ?? "",
            role: element.dataset.agentRole ?? element.tagName.toLowerCase(),
            label:
              element.dataset.agentLabel ??
              element.getAttribute("aria-label") ??
              element.textContent?.trim().slice(0, 80) ??
              "",
            actions: (element.dataset.agentActions ?? "click").split(",").filter(Boolean),
            disabled:
              element instanceof HTMLButtonElement
                ? element.disabled
                : element.getAttribute("aria-disabled") === "true",
            visible,
          };
        })
        .filter((node) => node.id && node.visible);

      return {
        revision: store.getSnapshot().revision,
        screen: "editor",
        context: getRuntime().getContext(),
        elements,
      };
    },

    audit: auditUi,

    context: {
      getState: () => getRuntime().getContext(),
    },

    requestApproval: (request) => getRuntime().requestApproval(request),

    captions: {
      transcribe: (assetId) => getRuntime().transcribeCaptions(assetId),
    },

    quickCut: {
      run: (options) => getRuntime().runQuickCut(options),
    },

    review: {
      timeline: () => getRuntime().reviewTimeline(),
      video: (path) => getRuntime().reviewVideo(path),
      footage: () => getRuntime().analyzeFootage(),
    },

    click: (id) => {
      const blocked = blockedAgentTarget(id);
      if (blocked) {
        return { ok: false, message: `${blocked}（${id}）` };
      }
      const element = findElement(id);
      if (!element) {
        return { ok: false, message: `找不到界面元素 ${id}` };
      }
      if (element instanceof HTMLButtonElement && element.disabled) {
        return { ok: false, message: `界面元素 ${id} 当前不可点击` };
      }
      element.click();
      return { ok: true, message: `已点击 ${id}`, revision: store.getSnapshot().revision };
    },

    setValue: (id, value) => {
      const blocked = blockedAgentTarget(id);
      if (blocked) {
        return { ok: false, message: `${blocked}（${id}）` };
      }
      const element = findElement(id);
      if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) {
        return { ok: false, message: `界面元素 ${id} 不是可输入控件` };
      }
      const prototype = Object.getPrototypeOf(element);
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(element, String(value));
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, message: `已设置 ${id}`, revision: store.getSnapshot().revision };
    },

    execute: (command) => toResult(store.execute(command), command.type),
    getProject: () => structuredClone(store.getSnapshot()),
    getAssets: () => getRuntime().getAssets(),
    plan: {
      propose: (shots) => getRuntime().proposePlan(shots),
    },
    audio: {
      getAnalyses: () => getRuntime().getAudioAnalyses(),
      listSfx: () => getRuntime().listSfx(),
      insertSfx: (effect) => getRuntime().insertSfx(effect),
      speak: (text, rate) => getRuntime().speak(text, rate),
    },
    preview: {
      seek: (time) => {
        getRuntime().seek(time);
        return { ok: true, message: `已定位到 ${time}s`, revision: store.getSnapshot().revision };
      },
      play: () => {
        getRuntime().play();
        return { ok: true, message: "已开始播放", revision: store.getSnapshot().revision };
      },
      pause: () => {
        getRuntime().pause();
        return { ok: true, message: "已暂停", revision: store.getSnapshot().revision };
      },
      getState: () => ({
        playhead: getRuntime().getPlayhead(),
        playing: getRuntime().isPlaying(),
      }),
    },
    render: {
      getSettings: () => getRuntime().getRenderSettings(),
      updateSettings: (patch) => {
        getRuntime().updateRenderSettings(patch);
        return {
          ok: true,
          message: "渲染设置已更新",
          revision: store.getSnapshot().revision,
        };
      },
      buildRequest: (settings) =>
        buildRenderRequest(store.getSnapshot(), getRuntime().getAssets(), {
          ...getRuntime().getRenderSettings(),
          ...settings,
        }),
      start: (settings) => getRuntime().exportProject(settings),
      batch: (jobs) => getRuntime().exportBatch(jobs),
    },
    selfTest: () => runSelfTest(() => getRuntime().getAudioAnalyses()),

    timeline: {
      dragClip: (clipId, start, trackId) =>
        toResult(store.execute({ type: "clip.move", clipId, start, trackId }), "clip.move"),
      trimClip: (clipId, edge, delta) => {
        let maxDuration: number | undefined;
        if (edge === "end") {
          const clip = store.getClip(clipId);
          const asset = clip?.assetId
            ? getRuntime()
                .getAssets()
                .find((item) => item.id === clip.assetId)
            : undefined;
          if (clip && asset && !asset.isImage) {
            const seconds = parseMediaDuration(asset.duration);
            if (seconds && seconds > 0) {
              const speed = clip.speed && clip.speed > 0 ? clip.speed : 1;
              maxDuration = Math.max(0.2, (seconds - (clip.sourceIn ?? 0)) / speed);
            }
          }
        }
        return toResult(
          store.execute({ type: "clip.trim", clipId, edge, delta, maxDuration }),
          "clip.trim",
        );
      },
      splitClip: (clipId, at) =>
        toResult(store.execute({ type: "clip.split", clipId, at }), "clip.split"),
      deleteClip: (clipId, ripple = false) =>
        toResult(store.execute({ type: "clip.delete", clipId, ripple }), "clip.delete"),
      duplicateClip: (clipId) =>
        toResult(store.execute({ type: "clip.duplicate", clipId }), "clip.duplicate"),
      addTrack: (kind) =>
        toResult(store.execute({ type: "track.add", kind }), "track.add"),
      setTransform: (clipId, patch) =>
        toResult(store.execute({ type: "clip.update", clipId, patch }), "clip.update"),
      addKeyframe: (clipId, keyframe) =>
        toResult(store.execute({ type: "clip.keyframe", clipId, keyframe }), "clip.keyframe"),
      removeKeyframe: (clipId, keyframeId) =>
        toResult(
          store.execute({ type: "clip.keyframeRemove", clipId, keyframeId }),
          "clip.keyframeRemove",
        ),
      setMask: (clipId, mask) =>
        toResult(
          store.execute({
            type: "clip.update",
            clipId,
            patch: { mask: mask ?? undefined },
          }),
          "clip.update",
        ),
      speedRamp: (clipId, preset) => {
        const project = store.getSnapshot();
        const track = project.tracks.find((item) =>
          item.clips.some((clip) => clip.id === clipId),
        );
        if (!track) {
          return { ok: false, message: "找不到要变速的片段", revision: project.revision };
        }
        const result = buildSpeedRamp(track.clips, clipId, preset);
        if ("error" in result) {
          return { ok: false, message: result.error, revision: project.revision };
        }
        return toResult(
          store.execute({ type: "track.replace", trackId: track.id, clips: result.clips }),
          "speed_ramp",
        );
      },
      setBlend: (clipId, mode) =>
        toResult(
          store.execute({
            type: "clip.update",
            clipId,
            patch: { blendMode: mode },
          }),
          "clip.update",
        ),
    },
  };

  window.XimoCutAgent = api;
  return () => {
    if (window.XimoCutAgent === api) {
      delete window.XimoCutAgent;
    }
  };
}

function auditUi(): UiCoverageReport {
  const selector =
    'button, input, select, textarea, [role="button"], [role="tab"], [role="slider"], [role="switch"]';
  const all = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
  );
  const missing = all
    .filter((element) => !element.dataset.agentId)
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      label:
        element.getAttribute("aria-label") ??
        element.textContent?.trim().slice(0, 60) ??
        "",
      className: element.className,
    }));
  return {
    total: all.length,
    registered: all.length - missing.length,
    missing,
  };
}

function runSelfTest(getAudioAnalyses: () => unknown[]): SelfTestReport {
  const results: SelfTestResult[] = [];
  const fresh = () => new EditorStoreClass(createFixtureProject());
  const clipOf = (store: EditorStoreClass, clipId: string) =>
    store.getSnapshot().tracks.flatMap((track) => track.clips).find((clip) => clip.id === clipId);
  const assert: (condition: unknown, message: string) => asserts condition = (
    condition,
    message,
  ) => {
    if (!condition) {
      throw new Error(message);
    }
  };
  const check = (name: string, run: () => string) => {
    try {
      results.push({ name, ok: true, detail: run() });
    } catch (error) {
      results.push({
        name,
        ok: false,
        detail: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  check("clip.insert", () => {
    const store = fresh();
    const before = store.getSnapshot().tracks[0].clips.length;
    const result = store.execute({
      type: "clip.insert",
      trackId: "track-v2",
      clip: { id: "test-insert", name: "测试", start: 10, duration: 2, kind: "text", tone: "title" },
    });
    assert(result.ok, result.error ?? "插入失败");
    assert(store.getSnapshot().tracks[0].clips.length === before + 1, "片段数量未增加");
    return "插入成功";
  });

  check("track.insertClip", () => {
    const store = fresh();
    const before = store.getSnapshot().tracks.length;
    const result = store.execute({
      type: "track.insertClip",
      kind: "video",
      clip: { id: "test-new-track", name: "测试视频", start: 10, duration: 2, kind: "video", tone: "wave" },
    });
    assert(result.ok, result.error ?? "新轨插入失败");
    assert(store.getSnapshot().tracks.length === before + 1, "未创建新轨道");
    return "新轨插入成功";
  });

  check("clip.move", () => {
    const store = fresh();
    const result = store.execute({ type: "clip.move", clipId: "clip-music", start: 2 });
    assert(result.ok, result.error ?? "移动失败");
    assert(clipOf(store, "clip-music")?.start === 2, "起点未更新");
    return "移动成功";
  });

  check("clip.trim", () => {
    const store = fresh();
    const result = store.execute({ type: "clip.trim", clipId: "clip-02", edge: "end", delta: -1 });
    assert(result.ok, result.error ?? "裁剪失败");
    assert(Math.abs((clipOf(store, "clip-02")?.duration ?? 0) - 9.1) < 0.01, "时长未更新");
    return "裁剪成功";
  });

  check("clip.split", () => {
    const store = fresh();
    const before = store.getSnapshot().tracks[1].clips.length;
    const result = store.execute({ type: "clip.split", clipId: "clip-03", at: 24 });
    assert(result.ok, result.error ?? "分割失败");
    assert(store.getSnapshot().tracks[1].clips.length === before + 1, "片段数量未增加");
    return "分割成功";
  });

  check("clip.rippleDelete", () => {
    const store = fresh();
    const result = store.execute({ type: "clip.delete", clipId: "clip-03", ripple: true });
    assert(result.ok, result.error ?? "波纹删除失败");
    assert(Math.abs((clipOf(store, "clip-04")?.start ?? 0) - 18.3) < 0.01, "空隙未闭合");
    return "波纹删除成功";
  });

  check("clip.duplicate", () => {
    const store = fresh();
    const before = store.getSnapshot().tracks[0].clips.length;
    const result = store.execute({ type: "clip.duplicate", clipId: "clip-title" });
    assert(result.ok, result.error ?? "复制失败");
    assert(store.getSnapshot().tracks[0].clips.length === before + 1, "副本未创建");
    return "复制成功";
  });

  check("clip.update", () => {
    const store = fresh();
    const result = store.execute({
      type: "clip.update",
      clipId: "clip-02",
      patch: { opacity: 0.6, volumeDb: -18, ducking: true, denoise: true, fadeIn: 0.5, normalized: true },
    });
    assert(result.ok, result.error ?? "更新失败");
    const clip = clipOf(store, "clip-02");
    assert(clip?.opacity === 0.6 && clip.volumeDb === -18, "属性未写入");
    return "属性更新成功";
  });

  check("clip.speed", () => {
    const store = fresh();
    const result = store.execute({ type: "clip.speed", clipId: "clip-02", speed: 2 });
    assert(result.ok, result.error ?? "变速失败");
    assert(Math.abs((clipOf(store, "clip-02")?.duration ?? 0) - 5.05) < 0.01, "时长未变化");
    return "变速成功";
  });

  check("clip.transition", () => {
    const store = fresh();
    const result = store.execute({
      type: "clip.transition",
      clipId: "clip-02",
      edge: "in",
      transition: { type: "fade", duration: 0.5 },
    });
    assert(result.ok, result.error ?? "转场失败");
    assert(clipOf(store, "clip-02")?.transitionIn?.duration === 0.5, "转场未写入");
    return "转场成功";
  });

  check("clip.keyframe", () => {
    const store = fresh();
    const result = store.execute({
      type: "clip.keyframe",
      clipId: "clip-02",
      keyframe: { id: "kf-test", property: "opacity", time: 1, value: 0.5 },
    });
    assert(result.ok, result.error ?? "关键帧失败");
    assert(clipOf(store, "clip-02")?.keyframes?.length === 1, "关键帧未写入");
    return "关键帧成功";
  });

  check("clip.group", () => {
    const store = fresh();
    const result = store.execute({
      type: "clip.group",
      clipIds: ["clip-02", "clip-03"],
      groupId: "group-test",
    });
    assert(result.ok, result.error ?? "分组失败");
    assert(clipOf(store, "clip-02")?.groupId === "group-test", "分组未写入");
    return "分组成功";
  });

  check("marker.add/remove", () => {
    const store = fresh();
    assert(store.execute({ type: "marker.add", time: 20, label: "测试" }).ok, "标记添加失败");
    const marker = store.getSnapshot().markers.find((item) => item.label === "测试");
    assert(marker, "标记不存在");
    assert(store.execute({ type: "marker.remove", markerId: marker.id }).ok, "标记移除失败");
    assert(!store.getSnapshot().markers.some((item) => item.id === marker.id), "标记未移除");
    return "标记增删成功";
  });

  check("track.add/update", () => {
    const store = fresh();
    const before = store.getSnapshot().tracks.length;
    assert(store.execute({ type: "track.add", kind: "video" }).ok, "轨道添加失败");
    assert(store.getSnapshot().tracks.length === before + 1, "轨道数量未增加");
    const track = store.getSnapshot().tracks.at(-1)!;
    assert(store.execute({ type: "track.update", trackId: track.id, patch: { locked: true } }).ok, "轨道更新失败");
    assert(store.getSnapshot().tracks.at(-1)?.locked === true, "锁定未生效");
    return "轨道增改成功";
  });

  check("track.replace", () => {
    const store = fresh();
    const result = store.execute({
      type: "track.replace",
      trackId: "track-v1",
      clips: planShotsToClips(fixturePlanShots),
    });
    assert(result.ok, result.error ?? "方案应用失败");
    assert(store.getSnapshot().tracks[1].clips.length === 4, "方案片段数不正确");
    return "方案应用成功";
  });

  check("undo/redo", () => {
    const store = fresh();
    const before = store.getSnapshot().tracks[1].clips.length;
    store.execute({ type: "clip.split", clipId: "clip-03", at: 24 });
    assert(store.undo().ok, "撤销失败");
    assert(store.getSnapshot().tracks[1].clips.length === before, "撤销未恢复");
    assert(store.redo().ok, "重做失败");
    assert(store.getSnapshot().tracks[1].clips.length === before + 1, "重做未恢复");
    return "撤销重做成功";
  });

  check("audio.analysis", () => {
    const analyses = getAudioAnalyses();
    return `已缓存 ${analyses.length} 条音频分析`;
  });

  const passed = results.filter((result) => result.ok).length;
  return {
    passed,
    failed: results.length - passed,
    results,
    ui: auditUi(),
  };
}

function findElement(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-agent-id="${CSS.escape(id)}"]`,
  );
}

function toResult(
  result: { ok: boolean; revision: number; error?: string },
  label: string,
): AgentActionResult {
  return {
    ok: result.ok,
    revision: result.revision,
    message: result.ok ? `${label} 执行成功` : result.error,
  };
}
