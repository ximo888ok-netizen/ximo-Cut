import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Upload } from "lucide-react";
import { AgentChat } from "./agent/AgentChat";
import { AgentComposer } from "./agent/AgentComposer";
import { AgentSurface } from "./agent/AgentSurface";
import { AgentApprovalBar } from "./agent/AgentApprovalBar";
import { ReviewCard } from "./agent/ReviewCard";
import type { AgentTab } from "./agent/AgentDock";
import {
  createAssistantRun,
  finishRun,
  finishToolStep,
  startToolStep,
  type AgentFeedMessage,
} from "./agent/feed";
import { ReplicaPanel } from "./agent/ReplicaPanel";
import { ScriptPanel } from "./agent/ScriptPanel";
import { AssetPanel } from "./AssetPanel";
import { CommandPalette, type PaletteCommand } from "./CommandPalette";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { PreviewStage } from "./PreviewStage";
import type { PreviewAudioLayer } from "./PreviewAudioLayers";
import type { BackgroundLayer } from "./PreviewBackground";
import { SettingsDialog } from "./SettingsDialog";
import { StatusBar } from "./StatusBar";
import { Timeline } from "./Timeline";
import { WindowChrome } from "./WindowChrome";
import {
  DEFAULT_ADJUST,
  DEFAULT_TEXT_STYLE,
  formatClock,
  formatTimecode,
  TOTAL_DURATION,
  type Asset,
  type AssetTab,
  type CaptionCue,
  type ClipAdjust,
  type DraftMeta,
  type Keyframe,
  type PlanShot,
  type RenderSettings,
  type TextStyle,
  type TrackClip,
  type TransitionSpec,
} from "./data";
import {
  createInitialProject,
  EditorStore,
  planShotsToClips,
  type CommandResult,
  type EditCommand,
  type ExecuteOptions,
  type ProjectState,
} from "./core/editorStore";
import {
  installAgentApi,
  type AgentActionResult,
  type AgentApprovalRequest,
  type AgentRuntime,
  type ProposedShot,
  type QuickCutRequest,
  type ReviewTimelineResult,
} from "./core/agentApi";
import { analyzeAudioFile, type AudioAnalysisResult } from "./core/audioAnalysis";
import { buildStoryPlan, type StoryStyle } from "./core/story";
import { parseSrt } from "./core/subtitles";
import { transcribeAsset, transcribeSegments } from "./core/asr";
import { listBuiltinMusic, musicToAsset, type BuiltinMusic } from "./core/music";
import { listBuiltinSfx, sfxToAsset, type BuiltinSfx } from "./core/sfx";
import { speechToAsset, synthesizeSpeech } from "./core/tts";
import {
  analyzeMaterial,
  mapCuesToTimeline,
  planQuickCut,
  type QuickCutMaterial,
  type QuickCutWindow,
} from "./core/quickCut";
import {
  formatReview,
  renderAndReview,
  reviewGrade,
  reviewVideo as reviewVideoFile,
  type FootageAnalysis,
  type ReviewReport,
} from "./core/review";
import {
  buildDraftContents,
  buildDraftMeta,
  emptyDraftMeta,
  readDraft,
  saveDraft,
} from "./core/drafts";
import { checkQwenStatus, runQwenAgentTurn } from "./core/qwenClient";
import { loadSettings, saveSettings, type EditorSettings } from "./core/settings";
import {
  isTauriRuntime,
  localFileUrl,
  mediaInfoFromPaths,
  openProjectDialog,
  parseProjectFile,
  pickMediaFiles,
  readLocalFile,
  renderVideoFile,
  saveProjectDialog,
  saveVideoDialog,
  serializeProjectFile,
  writeProjectFile,
  type MediaFileInfo,
} from "./core/desktop";
import { buildRenderRequest } from "./core/renderRequest";
import { buildPreviewFilter, clipOverlays } from "./core/looks";
import { clipTransformAt } from "./core/keyframes";
import {
  buildCustomSpeedRamp,
  buildSpeedRamp,
  SPEED_RAMP_LABELS,
  type SpeedRampPreset,
} from "./core/speedRamp";
import { buildScriptClips, pickScriptAssets } from "./core/scriptApply";
import type { ScriptDoc } from "./core/scripts";
import "./editor.css";
import "./agent/agent.css";

const initialMessages: AgentFeedMessage[] = [
  {
    id: "message-01",
    role: "assistant",
    text: "你好，我是 ximo-Cut 的 AI 剪辑助手。\n先在左侧导入视频或音频，然后告诉我你想怎么剪。\n我会先给出镜头方案，你确认后才会写入时间线。",
  },
];

const initialRenderSettings: RenderSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  bitrate: "12 Mbps",
  format: "mp4",
  burnSubtitles: true,
  rangeStart: 0,
  rangeEnd: TOTAL_DURATION,
};

interface EditorAppProps {
  draftId?: string;
  onBackHome?: () => void;
  initialScriptId?: string | null;
}

export function EditorApp({ draftId, onBackHome, initialScriptId }: EditorAppProps = {}) {
  const [store] = useState(() => new EditorStore(createInitialProject()));
  const project = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [settings, setSettings] = useState<EditorSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [zoom, setZoom] = useState(() => settings.timeline.defaultZoom);
  const [activeTool, setActiveTool] = useState<"select" | "blade" | "ripple">("select");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const selectedClipId =
    selectedClipIds.length > 0 ? selectedClipIds[selectedClipIds.length - 1] : null;
  const setSelectedClipId = (id: string | null) =>
    setSelectedClipIds(id ? [id] : []);
  const [planShots, setPlanShots] = useState<PlanShot[]>([]);
  const [activeTab, setActiveTab] = useState<AssetTab>("media");
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentTab, setAgentTab] = useState<AgentTab>("chat");
  const [pendingScriptId, setPendingScriptId] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(false);
  const [leftWidth, setLeftWidth] = useState(288);
  const [rightWidth, setRightWidth] = useState(344);
  const [messages, setMessages] = useState<AgentFeedMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [applied, setApplied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [userAssets, setUserAssets] = useState<Asset[]>([]);
  const [audioAnalyses, setAudioAnalyses] = useState<AudioAnalysisResult[]>([]);
  const [renderSettings, setRenderSettings] = useState<RenderSettings>(initialRenderSettings);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [savedRevision, setSavedRevision] = useState(0);
  const [aiOnline, setAiOnline] = useState(false);
  const [aiKeySource, setAiKeySource] = useState<"server" | "settings" | null>(null);
  const [rendering, setRendering] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [assetDialog, setAssetDialog] = useState<{
    asset: Asset;
    mode: "rename" | "delete";
  } | null>(null);
  const [assetNameDraft, setAssetNameDraft] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [showCaptions, setShowCaptions] = useState(() => settings.preview.showCaptions);
  const [snapEnabled, setSnapEnabled] = useState(() => settings.timeline.snap);
  const [recording, setRecording] = useState(false);
  const [captionBusy, setCaptionBusy] = useState(false);
  const [quickCutBusy, setQuickCutBusy] = useState(false);
  const [storyBusy, setStoryBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewReport, setReviewReport] = useState<ReviewReport | null>(null);
  const [draftReady, setDraftReady] = useState(!draftId);
  const draftMetaRef = useRef<DraftMeta | null>(null);
  const draftLoadedRef = useRef(false);
  const toastTimer = useRef<number | null>(null);
  const replyTimer = useRef<number | null>(null);
  const runAbortRef = useRef<AbortController | null>(null);
  const runCheckpointsRef = useRef(new Map<string, ProjectState>());
  const approvalResolverRef = useRef<((approved: boolean) => void) | null>(null);
  const [approval, setApproval] = useState<AgentApprovalRequest | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const objectUrlsRef = useRef<string[]>([]);
  const audioAnalysesRef = useRef<AudioAnalysisResult[]>([]);
  const runtimeRef = useRef<AgentRuntime | null>(null);
  const renderSettingsRef = useRef(renderSettings);
  renderSettingsRef.current = renderSettings;
  const restoreBoundsRef = useRef<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);
  const clipboardRef = useRef<TrackClip | null>(null);
  const autoRangeRef = useRef(true);
  const importFilesRef = useRef<(files: FileList | null) => Promise<void>>(async () => undefined);
  const importPathsRef = useRef<(infos: MediaFileInfo[]) => Promise<void>>(async () => undefined);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    audioAnalysesRef.current = audioAnalyses;
  }, [audioAnalyses]);

  useEffect(() => {
    let cancelled = false;
    void checkQwenStatus(settings.ai.baseUrl, settings.ai.apiKey).then((status) => {
      if (cancelled) {
        return;
      }
      const hasSettingsKey = settings.ai.apiKey.trim().length > 0;
      setAiOnline(status.reachable && status.configured);
      setAiKeySource(status.reachable && status.configured && hasSettingsKey ? "settings" : null);
    });
    return () => {
      cancelled = true;
    };
  }, [settings.ai.baseUrl, settings.ai.apiKey]);

  useEffect(
    () => installAgentApi(store, () => runtimeRef.current as AgentRuntime),
    [store],
  );

  useEffect(() => {
    if (!initialScriptId) {
      return;
    }
    setPendingScriptId(initialScriptId);
    setAgentTab("script");
    setAgentOpen(true);
  }, [initialScriptId]);

  useEffect(() => {
    if (!playing) {
      return;
    }

    const timer = window.setInterval(() => {
      setPlayhead((current) => {
        const next = current + 0.1;
        return next >= project.duration ? 0 : next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [playing, project.duration]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && event.key === ",") {
        event.preventDefault();
        setSettingsOpen(true);
        return;
      }

      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (modifier && event.key.toLowerCase() === "c") {
        if (window.getSelection()?.toString()) {
          return;
        }
        event.preventDefault();
        copySelected();
        return;
      }

      if (modifier && event.key.toLowerCase() === "x") {
        event.preventDefault();
        cutSelected();
        return;
      }

      if (modifier && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClip();
        return;
      }

      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveProject(event.shiftKey);
        return;
      }

      if (modifier && event.key.toLowerCase() === "o") {
        event.preventDefault();
        void openProject();
        return;
      }

      if (modifier && event.key.toLowerCase() === "n") {
        event.preventDefault();
        newProject();
        return;
      }

      if (modifier && event.key.toLowerCase() === "e") {
        event.preventDefault();
        void exportProject();
        return;
      }

      if (modifier && event.key.toLowerCase() === "b") {
        event.preventDefault();
        splitSelected();
        return;
      }

      if (modifier && event.key.toLowerCase() === "f") {
        event.preventDefault();
        if (activeTab !== "media" && activeTab !== "audio") {
          setActiveTab("media");
        }
        window.setTimeout(() => {
          document
            .querySelector<HTMLInputElement>('[data-agent-id="input.asset-search"]')
            ?.focus();
        }, 50);
        return;
      }

      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        const result = event.shiftKey ? store.redo() : store.undo();
        if (!result.ok) {
          showToast(result.error ?? "撤销失败");
        } else {
          setApplied(isPlanApplied());
          showToast(event.shiftKey ? "已重做" : "已撤销上一步");
        }
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedClipIds.length > 0) {
        event.preventDefault();
        if (selectedClipIds.length === 1) {
          const result = store.execute({
            type: "clip.delete",
            clipId: selectedClipIds[0],
            ripple: event.shiftKey,
          });
          if (!result.ok) {
            showToast(result.error ?? "删除失败");
          } else {
            setSelectedClipIds([]);
            showToast(event.shiftKey ? "已波纹删除并闭合空隙" : "已删除片段");
          }
        } else {
          let removed = 0;
          for (const clipId of selectedClipIds) {
            if (store.execute({ type: "clip.delete", clipId }).ok) {
              removed += 1;
            }
          }
          setSelectedClipIds([]);
          showToast(
            `已删除 ${removed} 个片段${event.shiftKey ? " · 多选删除不执行波纹" : ""}`,
          );
        }
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const step = event.shiftKey ? 1 : 1 / Math.max(1, project.fps);
        setPlayhead((value) =>
          Math.min(
            project.duration,
            Math.max(0, value + (event.key === "ArrowRight" ? step : -step)),
          ),
        );
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setPlaying((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeTab,
    selectedClipIds,
    playhead,
    showToast,
    store,
    project,
    projectPath,
    userAssets,
    renderSettings,
    planShots,
  ]);

  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) {
        event.preventDefault();
        setDragActive(true);
      }
    };
    const onDragLeave = (event: DragEvent) => {
      if (
        event.clientX <= 0 ||
        event.clientY <= 0 ||
        event.clientX >= window.innerWidth ||
        event.clientY >= window.innerHeight
      ) {
        setDragActive(false);
      }
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      setDragActive(false);
      if (event.dataTransfer?.files.length) {
        void importFilesRef.current(event.dataTransfer.files);
      }
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime) {
      return;
    }
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      const dispose = await getCurrentWindow().onDragDropEvent(async (event) => {
        if (event.payload.type === "over") {
          setDragActive(true);
          return;
        }
        if (event.payload.type === "drop") {
          setDragActive(false);
          const paths = event.payload.paths ?? [];
          if (paths.length > 0) {
            const infos = await mediaInfoFromPaths(paths);
            if (!cancelled) {
              await importPathsRef.current(infos);
            }
          }
          return;
        }
        setDragActive(false);
      });
      if (cancelled) {
        dispose();
      } else {
        unlisten = dispose;
      }
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    if (replyTimer.current) {
      window.clearTimeout(replyTimer.current);
    }
    runAbortRef.current?.abort();
    approvalResolverRef.current?.(false);
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const allClips = project.tracks.flatMap((track) => track.clips);
  const hasContent = allClips.length > 0 || userAssets.length > 0 || planShots.length > 0;
  const dirty =
    project.revision !== savedRevision && (hasContent || project.revision > 1);
  const saveState = draftId
    ? draftReady
      ? "自动保存"
      : "读取草稿"
    : dirty
      ? "未保存"
      : savedRevision > 0
        ? "已保存"
        : "新工程";

  const contentEnd = allClips.reduce(
    (max, clip) => Math.max(max, clip.start + clip.duration),
    0,
  );

  useEffect(() => {
    if (!autoRangeRef.current) {
      return;
    }
    const rangeEnd = Number(contentEnd.toFixed(2));
    setRenderSettings((current) =>
      Math.abs(current.rangeStart) < 0.011 && Math.abs(current.rangeEnd - rangeEnd) < 0.05
        ? current
        : { ...current, rangeStart: 0, rangeEnd },
    );
  }, [contentEnd]);

  useEffect(() => {
    if (!settings.storage.autoSave || !projectPath || !dirty) {
      return;
    }
    const revision = project.revision;
    const timer = window.setTimeout(() => {
      const contents = serializeProjectFile(
        project,
        userAssets,
        renderSettings,
        planShots,
        audioAnalysesRef.current,
      );
      void writeProjectFile(projectPath, contents)
        .then(() => setSavedRevision(revision))
        .catch((error) =>
          showToast(error instanceof Error ? error.message : "自动保存失败"),
        );
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [
    dirty,
    planShots,
    project,
    projectPath,
    renderSettings,
    settings.storage.autoSave,
    showToast,
    userAssets,
  ]);

  const applySettings = (next: EditorSettings) => {
    const exportChanged =
      next.exportDefaults.width !== settings.exportDefaults.width ||
      next.exportDefaults.height !== settings.exportDefaults.height ||
      next.exportDefaults.fps !== settings.exportDefaults.fps ||
      next.exportDefaults.format !== settings.exportDefaults.format ||
      next.exportDefaults.bitrate !== settings.exportDefaults.bitrate;

    setSettings(next);
    saveSettings(next);
    setSettingsOpen(false);
    if (exportChanged) {
      setRenderSettings((current) => ({ ...current, ...next.exportDefaults }));
    }
    if (next.timeline.defaultZoom !== settings.timeline.defaultZoom) {
      setZoom(next.timeline.defaultZoom);
    }
    if (next.timeline.snap !== settings.timeline.snap) {
      setSnapEnabled(next.timeline.snap);
    }
    if (next.preview.showCaptions !== settings.preview.showCaptions) {
      setShowCaptions(next.preview.showCaptions);
    }
    showToast("设置已保存");
  };

  const projectFileLabel = draftId
    ? project.name
    : projectPath
      ? (projectPath.split(/[\\/]/).pop() ?? `${project.name}.ocproj`).replace(/\.json$/i, "")
      : `${project.name}.ocproj`;
  const selectedClip = allClips.find((clip) => clip.id === selectedClipId) ?? null;
  const selectedTrack = project.tracks.find((track) =>
    track.clips.some((clip) => clip.id === selectedClipId),
  );
  const visibleAssets = userAssets;
  const selectedClipAsset = selectedClip?.assetId
    ? visibleAssets.find((asset) => asset.id === selectedClip.assetId)
    : undefined;
  const audioAnalysis = selectedClip
    ? selectedClip.kind === "audio"
      ? (audioAnalyses.find((item) => item.file_name === selectedClipAsset?.name) ?? null)
      : null
    : (audioAnalyses[0] ?? null);
  const captions: CaptionCue[] = allClips
    .filter((clip) => clip.kind === "text" && Boolean(clip.text))
    .sort((a, b) => a.start - b.start)
    .map((clip) => ({
      id: clip.id,
      start: clip.start,
      time: formatTimecode(clip.start),
      text: clip.text ?? clip.name,
    }));
  const videoClipsAtPlayhead = project.tracks
    .filter((track) => track.kind === "video" && !track.hidden)
    .flatMap((track) => track.clips)
    .filter((clip) => playhead >= clip.start && playhead < clip.start + clip.duration);
  const activeVideoClip = videoClipsAtPlayhead[0];
  const previewAsset = activeVideoClip?.assetId
    ? visibleAssets.find((asset) => asset.id === activeVideoClip.assetId)
    : undefined;
  const previewTransform = activeVideoClip
    ? clipTransformAt(activeVideoClip, Math.max(0, playhead - activeVideoClip.start))
    : null;
  // 预览按导出顺序叠加：越靠上的轨道越靠前景，主视频单独渲染在最上层
  const backgroundLayers: BackgroundLayer[] = videoClipsAtPlayhead
    .slice(1)
    .reverse()
    .flatMap((clip) => {
      const asset = clip.assetId
        ? visibleAssets.find((item) => item.id === clip.assetId)
        : undefined;
      if (!asset?.url) {
        return [];
      }
      const transform = clipTransformAt(clip, Math.max(0, playhead - clip.start));
      const track = project.tracks.find((item) =>
        item.clips.some((itemClip) => itemClip.id === clip.id),
      );
      return [
        {
          id: clip.id,
          url: asset.url,
          filter: buildPreviewFilter(clip),
          mask: clip.mask ?? null,
          scale: transform?.scale ?? 1,
          rotation: transform?.rotation ?? 0,
          positionX: transform?.positionX ?? 0,
          positionY: transform?.positionY ?? 0,
          start: clip.start,
          sourceIn: clip.sourceIn ?? 0,
          speed: clip.speed ?? 1,
          isImage: Boolean(asset.isImage),
          volume: Math.min(1, Math.max(0, Math.pow(10, (clip.volumeDb ?? 0) / 20))),
          muted: Boolean(clip.muted || track?.muted),
          blendMode: clip.blendMode ?? "normal",
        },
      ];
    });
  const previewFilter = activeVideoClip ? buildPreviewFilter(activeVideoClip) : undefined;
  const previewOverlays = activeVideoClip ? clipOverlays(activeVideoClip) : [];
  const previewOverlay = activeVideoClip
    ? previewEdgeOverlay(activeVideoClip, playhead)
    : undefined;
  const activeTextClips = project.tracks
    .filter((track) => track.kind === "text" && !track.hidden)
    .flatMap((track) => track.clips)
    .filter(
      (clip) => playhead >= clip.start && playhead < clip.start + clip.duration,
    )
    .map((clip) => ({
      id: clip.id,
      text: clip.text ?? clip.name,
      start: clip.start,
      duration: clip.duration,
      style: clip.textStyle,
      role:
        clip.textRole ??
        (clip.tone === "caption"
          ? ("caption" as const)
          : clip.tone === "sticker"
            ? ("sticker" as const)
            : ("title" as const)),
    }));
  const activeVideoTrack = project.tracks.find(
    (track) => track.kind === "video" && track.clips.some((clip) => clip.id === activeVideoClip?.id),
  );
  const previewMuted = Boolean(activeVideoClip?.muted || activeVideoTrack?.muted);
  const previewVolume = Math.min(
    1,
    Math.max(0, Math.pow(10, (activeVideoClip?.volumeDb ?? 0) / 20)),
  );
  const previewDucked = Boolean(activeVideoClip && !previewMuted);
  const audioTrackLayers: PreviewAudioLayer[] = project.tracks
    .filter((track) => track.kind === "audio" && !track.hidden && !track.muted)
    .flatMap((track) =>
      track.clips
        .filter(
          (clip) =>
            !clip.muted && playhead >= clip.start && playhead < clip.start + clip.duration,
        )
        .map((clip) => {
          const asset = clip.assetId
            ? visibleAssets.find((item) => item.id === clip.assetId)
            : undefined;
          if (!asset?.url) {
            return null;
          }
          return {
            id: clip.id,
            url: asset.url,
            start: clip.start,
            sourceIn: clip.sourceIn ?? 0,
            speed: clip.speed ?? 1,
            volume: Math.min(1, Math.max(0, Math.pow(10, (clip.volumeDb ?? 0) / 20))),
            duck: Boolean(clip.ducking),
          };
        })
        .filter((layer): layer is PreviewAudioLayer => layer !== null),
    );
  // 视频轨的声音由预览画布里的视频元素负责，音频轨单独补层
  const previewAudioLayers: PreviewAudioLayer[] = audioTrackLayers;

  const runCommand = useCallback(
    (command: EditCommand, options?: ExecuteOptions): CommandResult => {
      const result = store.execute(command, options);
      if (!result.ok && result.error) {
        showToast(result.error);
      }
      return result;
    },
    [showToast, store],
  );

  const isPlanApplied = () => {
    if (planShots.length === 0) {
      return false;
    }
    const track = store.getSnapshot().tracks.find((item) => item.id === "track-v1");
    return Boolean(
      track &&
        track.clips.length === planShots.length &&
        track.clips.every((clip) => clip.id.startsWith("plan-clip-")),
    );
  };

  const undo = () => {
    const result = store.undo();
    if (!result.ok) {
      showToast(result.error ?? "撤销失败");
      return;
    }
    setApplied(isPlanApplied());
    showToast("已撤销上一步");
  };

  const redo = () => {
    const result = store.redo();
    if (!result.ok) {
      showToast(result.error ?? "重做失败");
      return;
    }
    setApplied(isPlanApplied());
    showToast("已重做");
  };

  const splitSelected = () => {
    if (!selectedClip) {
      showToast("请先选择一个片段");
      return;
    }
    if (
      playhead <= selectedClip.start + 0.15 ||
      playhead >= selectedClip.start + selectedClip.duration - 0.15
    ) {
      showToast("请先把播放头移到片段内部再分割");
      return;
    }
    const result = store.execute({
      type: "clip.split",
      clipId: selectedClip.id,
      at: playhead,
    });
    if (!result.ok) {
      showToast(result.error ?? "分割失败");
    } else {
      showToast("已分割片段");
    }
  };

  const rippleDeleteSelected = () => {
    if (!selectedClip) {
      showToast("请先选择一个片段");
      return;
    }
    const result = store.execute({
      type: "clip.delete",
      clipId: selectedClip.id,
      ripple: true,
    });
    if (!result.ok) {
      showToast(result.error ?? "删除失败");
      return;
    }
    setSelectedClipId(null);
    showToast("已波纹删除并闭合空隙");
  };

  const copySelected = () => {
    if (!selectedClip) {
      showToast("请先选择一个片段");
      return;
    }
    clipboardRef.current = structuredClone(selectedClip);
    showToast(`已复制「${selectedClip.name}」`);
  };

  const cutSelected = () => {
    if (!selectedClip) {
      showToast("请先选择一个片段");
      return;
    }
    clipboardRef.current = structuredClone(selectedClip);
    const result = store.execute({ type: "clip.delete", clipId: selectedClip.id });
    if (!result.ok) {
      showToast(result.error ?? "剪切失败");
      return;
    }
    setSelectedClipId(null);
    showToast(`已剪切「${selectedClip.name}」`);
  };

  const pasteClip = () => {
    const source = clipboardRef.current;
    if (!source) {
      showToast("剪贴板里还没有片段");
      return;
    }
    const length = Math.min(source.duration, project.duration);
    const start = Math.min(Math.max(0, playhead), Math.max(0, project.duration - length));
    const target = findFittingTrack(source.kind, start, length);
    const clip: TrackClip = {
      ...structuredClone(source),
      id: `clip-${Date.now().toString(36)}`,
      start: Number(start.toFixed(3)),
      duration: Number(length.toFixed(3)),
    };
    const result = target
      ? runCommand({ type: "clip.insert", trackId: target.id, clip })
      : runCommand({ type: "track.insertClip", kind: source.kind, clip });
    if (result.ok) {
      setSelectedClipId(clip.id);
      showToast(`已粘贴「${clip.name}」`);
    }
  };

  const addTransitionSelected = () => {
    applyTransitionToSelected({ type: "crossfade", duration: 0.5 });
  };

  const applyTransitionToSelected = (transition: TransitionSpec) => {
    if (!selectedClipId || !selectedClip) {
      showToast("请先在时间线选择一个片段");
      return;
    }
    if (transition.duration <= 0) {
      runCommand({ type: "clip.transition", clipId: selectedClipId, edge: "in", transition: null });
      runCommand({ type: "clip.transition", clipId: selectedClipId, edge: "out", transition: null });
      showToast("已移除转场");
      return;
    }
    const track = project.tracks.find((item) =>
      item.clips.some((clip) => clip.id === selectedClipId),
    );
    const previous = track?.clips
      .filter((clip) => clip.start + clip.duration <= selectedClip.start + 0.01)
      .sort((a, b) => b.start - a.start)[0];
    const adjacent =
      previous && Math.abs(previous.start + previous.duration - selectedClip.start) < 0.05;

    const applied: CommandResult = adjacent
      ? store.execute({
          type: "clip.transition",
          clipId: previous.id,
          edge: "out",
          transition,
        })
      : { ok: true, revision: project.revision };
    const result = applied.ok
      ? store.execute({
          type: "clip.transition",
          clipId: selectedClipId,
          edge: "in",
          transition,
        })
      : applied;

    if (!result.ok) {
      showToast(result.error ?? "添加转场失败");
      return;
    }
    showToast(`已应用 ${transition.duration}s 转场`);
  };

  const applyFilterToSelected = (look: string, label: string) => {
    if (!selectedClipId) {
      showToast("请先在时间线选择一个片段");
      return;
    }
    const result = runCommand({
      type: "clip.update",
      clipId: selectedClipId,
      patch: { look, filter: "" },
    });
    if (result.ok) {
      showToast(`已应用「${label}」`);
    }
  };

  const adjustSelectedClip = (patch: Partial<ClipAdjust>) => {
    if (!selectedClipId) {
      showToast("请先在时间线选择一个片段");
      return;
    }
    const current = { ...DEFAULT_ADJUST, ...(selectedClip?.adjust ?? {}) };
    runCommand(
      {
        type: "clip.update",
        clipId: selectedClipId,
        patch: { adjust: { ...current, ...patch } },
      },
      { coalesceKey: `adjust:${selectedClipId}:${Object.keys(patch).sort().join(",")}` },
    );
  };

  const updateSelectedTransform = (patch: {
    scale?: number;
    rotation?: number;
    opacity?: number;
    positionX?: number;
    positionY?: number;
  }) => {
    if (!selectedClip) {
      showToast("请先在时间线选择一个片段");
      return;
    }
    const localTime = Number(
      Math.max(0, Math.min(selectedClip.duration, playhead - selectedClip.start)).toFixed(3),
    );
    const entries = Object.entries(patch).filter(
      (entry): entry is [Keyframe["property"], number] => typeof entry[1] === "number",
    );
    for (const [property, value] of entries) {
      const keyed = (selectedClip.keyframes ?? []).some(
        (keyframe) => keyframe.property === property,
      );
      const coalesceKey = `transform:${selectedClip.id}:${property}`;
      if (keyed) {
        runCommand(
          {
            type: "clip.keyframe",
            clipId: selectedClip.id,
            keyframe: {
              id: `kf-${Date.now().toString(36)}-${property}-${Math.round(localTime * 1000)}`,
              property,
              time: localTime,
              value,
              easing: "easeInOut",
            },
          },
          { coalesceKey },
        );
      } else {
        runCommand(
          {
            type: "clip.update",
            clipId: selectedClip.id,
            patch: { [property]: value },
          },
          { coalesceKey },
        );
      }
    }
  };

  const applySpeedRamp = (preset: SpeedRampPreset) => {
    if (!selectedClip || !selectedTrack) {
      showToast("请先选择一个视频片段");
      return;
    }
    const result = buildSpeedRamp(selectedTrack.clips, selectedClip.id, preset);
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    const applied = runCommand({
      type: "track.replace",
      trackId: selectedTrack.id,
      clips: result.clips,
    });
    if (applied.ok) {
      setSelectedClipId(`${selectedClip.id}-ramp-a`);
      showToast(
        `已应用「${SPEED_RAMP_LABELS[preset]}」· 片段变为 ${result.total.toFixed(1)} 秒`,
      );
    }
  };

  const applyCustomSpeedRamp = (peakSpeed: number, fraction: number) => {
    if (!selectedClip || !selectedTrack) {
      showToast("请先选择一个视频片段");
      return;
    }
    const result = buildCustomSpeedRamp(selectedTrack.clips, selectedClip.id, {
      peakSpeed,
      fraction,
    });
    if ("error" in result) {
      showToast(result.error);
      return;
    }
    const applied = runCommand({
      type: "track.replace",
      trackId: selectedTrack.id,
      clips: result.clips,
    });
    if (applied.ok) {
      setSelectedClipId(`${selectedClip.id}-ramp-a`);
      showToast(
        `已应用自定义速度 · 峰值 ${peakSpeed.toFixed(2)}x · 片段变为 ${result.total.toFixed(1)} 秒`,
      );
    }
  };

  const findFittingTrack = (kind: TrackClip["kind"], start: number, length: number) =>
    project.tracks.find((track) => {
      if (track.kind !== kind || track.locked) {
        return false;
      }
      return !track.clips.some(
        (clip) =>
          start < clip.start + clip.duration - 0.001 &&
          start + length > clip.start + 0.001,
      );
    });

  const insertTextClip = (text: string, name: string, tone = "title", style?: TextStyle) => {
    const duration = 4;
    const start = Math.min(Math.max(0, playhead), project.duration - duration);
    const existing = findFittingTrack("text", start, duration);
    const clip: TrackClip = {
      id: `text-${Date.now().toString(36)}`,
      name,
      text,
      start: Number(start.toFixed(3)),
      duration,
      kind: "text",
      tone,
      textRole: tone === "caption" ? "caption" : tone === "sticker" ? "sticker" : "title",
      textStyle: { ...DEFAULT_TEXT_STYLE, ...style },
    };
    const result = existing
      ? runCommand({ type: "clip.insert", trackId: existing.id, clip })
      : runCommand({ type: "track.insertClip", kind: "text", clip });
    if (result.ok) {
      setSelectedClipId(clip.id);
      showToast(`已添加文本「${text}」`);
    }
  };

  const applySubtitlePreset = (style: TextStyle, label: string) => {
    if (selectedClip && selectedClip.kind === "text") {
      const result = runCommand({
        type: "clip.update",
        clipId: selectedClip.id,
        patch: {
          textStyle: { ...DEFAULT_TEXT_STYLE, ...style },
        },
      });
      if (result.ok) {
        showToast(`已套用字幕样式「${label}」`);
      }
      return;
    }
    insertTextClip("字幕文字", label, "caption", style);
  };

  const insertSticker = (glyph: string, name: string) => {
    insertTextClip(glyph, name, "sticker", { ...DEFAULT_TEXT_STYLE, size: 1.6, position: "center" });
  };

  const requestApproval = (request: AgentApprovalRequest) =>
    new Promise<boolean>((resolve) => {
      approvalResolverRef.current = resolve;
      setApproval(request);
    });

  const resolveApproval = (approved: boolean) => {
    approvalResolverRef.current?.(approved);
    approvalResolverRef.current = null;
    setApproval(null);
  };

  const stopAgentRun = () => {
    runAbortRef.current?.abort();
    resolveApproval(false);
  };

  const sendMessage = (
    text?: string,
    options?: {
      reuseUser?: boolean;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    },
  ) => {
    const content = (text ?? input).trim();
    if (!content || thinking) {
      return;
    }

    const history =
      options?.history ??
      messages
        .filter((message) => message.role === "user" || message.text.trim().length > 0)
        .slice(-6)
        .map((message) => ({ role: message.role, content: message.text }));
    const runId = crypto.randomUUID();
    const startedAt = Date.now();
    const revisionBefore = store.getSnapshot().revision;
    runCheckpointsRef.current.set(runId, store.checkpoint());
    setMessages((current) =>
      options?.reuseUser
        ? [...current, createAssistantRun(runId, startedAt)]
        : [
            ...current,
            { id: crypto.randomUUID(), role: "user", text: content },
            createAssistantRun(runId, startedAt),
          ],
    );
    setInput("");
    setThinking(true);
    const controller = new AbortController();
    runAbortRef.current = controller;

    const patchRun = (updater: (message: AgentFeedMessage) => AgentFeedMessage) => {
      setMessages((current) =>
        current.map((message) => (message.id === runId ? updater(message) : message)),
      );
    };
    const withUndo = (message: AgentFeedMessage): AgentFeedMessage => ({
      ...message,
      canUndo: store.getSnapshot().revision !== revisionBefore,
    });

    replyTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          const answer = await runQwenAgentTurn(content, history, settings.ai, {
            signal: controller.signal,
            onPhase: (phase) => patchRun((message) => ({ ...message, status: phase })),
            onReasoningDelta: (delta) =>
              patchRun((message) => ({
                ...message,
                reasoning: `${message.reasoning ?? ""}${delta}`,
              })),
            onContentDelta: (delta) =>
              patchRun((message) => ({ ...message, text: `${message.text}${delta}` })),
            onToolStart: (tool) =>
              patchRun((message) => startToolStep(message, { ...tool, at: Date.now() })),
            onToolEnd: (tool) =>
              patchRun((message) => finishToolStep(message, { ...tool, at: Date.now() })),
          });
          setAiOnline(true);
          setThinking(false);
          patchRun((message) => {
            const lastStep = message.steps?.[message.steps.length - 1];
            const hasAnswer = Boolean(answer || message.text.trim());
            return withUndo(
              finishRun(message, {
                status: lastStep?.status === "error" || !hasAnswer ? "error" : "done",
                at: Date.now(),
                text: message.text.trim()
                  ? message.text
                  : (answer ?? "Qwen 工具调用轮次用尽，请把任务拆小后重试。"),
              }),
            );
          });
        } catch (error) {
          const aborted =
            controller.signal.aborted ||
            (error instanceof DOMException && error.name === "AbortError");
          if (!aborted) {
            setAiOnline(false);
          }
          setThinking(false);
          patchRun((message) =>
            withUndo(
              finishRun(message, {
                status: aborted ? "stopped" : "error",
                at: Date.now(),
                text: message.text.trim()
                  ? message.text
                  : aborted
                    ? "已停止本次运行"
                    : error instanceof Error
                      ? error.message
                      : "Qwen 调用失败，请重试。",
              }),
            ),
          );
        } finally {
          if (runAbortRef.current === controller) {
            runAbortRef.current = null;
          }
        }
      })();
    }, 250);
  };

  const retryRun = (runId: string) => {
    if (thinking) {
      return;
    }
    const index = messages.findIndex((message) => message.id === runId);
    if (index < 0) {
      return;
    }
    let userIndex = -1;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (messages[cursor].role === "user") {
        userIndex = cursor;
        break;
      }
    }
    if (userIndex < 0) {
      return;
    }
    const text = messages[userIndex].text;
    const history = messages
      .slice(0, userIndex)
      .filter((message) => message.role === "user" || message.text.trim().length > 0)
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.text }));
    setMessages((current) => current.filter((message) => message.id !== runId));
    sendMessage(text, { reuseUser: true, history });
  };

  const undoRun = (runId: string) => {
    const checkpoint = runCheckpointsRef.current.get(runId);
    if (!checkpoint) {
      showToast("这次运行没有可撤销的修改");
      return;
    }
    const result = store.restore(checkpoint);
    if (!result.ok) {
      showToast(result.error ?? "撤销失败");
      return;
    }
    runCheckpointsRef.current.delete(runId);
    setMessages((current) =>
      current.map((message) =>
        message.id === runId ? { ...message, canUndo: false, undone: true } : message,
      ),
    );
    setSelectedClipId(null);
    showToast("已撤销本次 AI 修改");
  };

  const applyPlan = () => {
    if (planShots.length === 0) {
      showToast("AI 还没有生成可应用的剪辑方案");
      return;
    }
    const result = store.execute({
      type: "track.replace",
      trackId: "track-v1",
      clips: planShotsToClips(planShots),
    });
    if (!result.ok) {
      showToast(result.error ?? "应用方案失败");
      return;
    }
    setApplied(true);
    setSelectedClipId("plan-clip-1");
    showToast(`已应用 ${planShots.length} 个镜头到 V1 轨道 · 可一键撤销`);
  };

  const regeneratePlan = () => {
    if (thinking) {
      return;
    }
    if (planShots.length === 0) {
      showToast("还没有可重做的方案，请先让 AI 生成方案");
      return;
    }
    void sendMessage("基于当前素材重新生成剪辑方案");
  };

  const commitImported = (
    newAssets: Asset[],
    newAnalyses: AudioAnalysisResult[],
    imported: number,
  ) => {
    if (newAssets.length > 0) {
      setUserAssets((current) => [...newAssets, ...current]);
      setPlanShots([]);
      setApplied(false);
    }
    if (newAnalyses.length > 0) {
      setAudioAnalyses((current) => [...newAnalyses, ...current]);
      const first = newAnalyses[0];
      showToast(
        `已导入 ${imported} 个文件 · ${first.file_name}：${first.bpm ? `${first.bpm} BPM` : "节拍未识别"} · ${first.silence_ranges.length} 处静音`,
      );
    } else if (imported > 0) {
      showToast(`已导入 ${imported} 个文件`);
    }
  };

  const handleAutoCut = () => {
    if (planShots.length > 0) {
      applyPlan();
      return;
    }
    void runQuickCut({ vertical: renderSettings.height > renderSettings.width });
  };

  const importFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    let imported = 0;
    const newAssets: Asset[] = [];
    const newAnalyses: AudioAnalysisResult[] = [];

    for (const file of Array.from(files)) {
      const isAudio =
        file.type.startsWith("audio/") ||
        /\.(wav|mp3|m4a|aac|flac|ogg)$/i.test(file.name);
      const isVideo =
        file.type.startsWith("video/") ||
        /\.(mp4|mov|mkv|webm|avi)$/i.test(file.name);
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(file.name);
      if (!isAudio && !isVideo && !isImage) {
        continue;
      }

      let durationSeconds: number | null = null;
      if (isImage) {
        durationSeconds = 5;
      } else if (isAudio) {
        try {
          const analysis = await analyzeAudioFile(file);
          newAnalyses.push(analysis);
          durationSeconds = analysis.duration_ms / 1000;
        } catch {
          showToast(`无法解码音频 ${file.name}`);
        }
      } else {
        durationSeconds = await probeVideoDuration(file);
      }

      const objectUrl = URL.createObjectURL(file);
      const thumbnail = isImage
        ? objectUrl
        : isVideo && settings.media.generateThumbnails
          ? await captureVideoThumbnail(objectUrl)
          : undefined;
      newAssets.push({
        id: `import-${Date.now().toString(36)}-${imported}`,
        name: file.name,
        meta: `${(file.size / 1024 / 1024).toFixed(1)} MB · ${isAudio ? "音频" : isImage ? "图片" : "视频"}`,
        duration: durationSeconds ? formatClock(durationSeconds) : "—",
        kind: isAudio ? "audio" : "video",
        tone: isAudio ? "voice" : "wave",
        tag: isAudio ? "本地音频" : isImage ? "本地图片" : "本地视频",
        url: objectUrl,
        sizeBytes: file.size,
        thumbnail,
        isImage: isImage || undefined,
      });
      objectUrlsRef.current.push(objectUrl);
      imported += 1;
    }

    if (newAssets.length > 0) {
      commitImported(newAssets, newAnalyses, imported);
    }
  };

  const importPaths = async (infos: MediaFileInfo[]) => {
    let imported = 0;
    const newAssets: Asset[] = [];
    const newAnalyses: AudioAnalysisResult[] = [];

    for (const info of infos) {
      const isAudio = /\.(wav|mp3|m4a|aac|flac|ogg)$/i.test(info.name);
      const isVideo = /\.(mp4|mov|mkv|webm|avi)$/i.test(info.name);
      const isImage = /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(info.name);
      if (!isAudio && !isVideo && !isImage) {
        continue;
      }

      let url: string;
      try {
        url = await localFileUrl(info.path);
      } catch {
        showToast(`无法读取文件 ${info.name}`);
        continue;
      }

      let durationSeconds: number | null = null;
      if (isImage) {
        durationSeconds = 5;
      } else if (isAudio) {
        try {
          const file = await readLocalFile(info.path, info.name);
          const analysis = await analyzeAudioFile(file);
          newAnalyses.push(analysis);
          durationSeconds = analysis.duration_ms / 1000;
        } catch {
          showToast(`无法解码音频 ${info.name}`);
        }
      } else {
        durationSeconds = await probeVideoDuration(url);
      }

      newAssets.push({
        id: `import-${Date.now().toString(36)}-${imported}`,
        name: info.name,
        meta: `${(info.size / 1024 / 1024).toFixed(1)} MB · ${isAudio ? "音频" : isImage ? "图片" : "视频"}`,
        duration: durationSeconds ? formatClock(durationSeconds) : "—",
        kind: isAudio ? "audio" : "video",
        tone: isAudio ? "voice" : "wave",
        tag: isAudio ? "本地音频" : isImage ? "本地图片" : "本地视频",
        url,
        path: info.path,
        sizeBytes: info.size,
        thumbnail: isImage
          ? url
          : isVideo && settings.media.generateThumbnails
            ? await buildVideoThumbnail(info.path, url)
            : undefined,
        isImage: isImage || undefined,
      });
      imported += 1;
    }

    if (newAssets.length > 0) {
      commitImported(newAssets, newAnalyses, imported);
    }
  };

  const importMedia = async () => {
    if (!isTauriRuntime) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const infos = await pickMediaFiles();
      if (infos.length > 0) {
        await importPaths(infos);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "打开文件对话框失败");
    }
  };

  importFilesRef.current = importFiles;
  importPathsRef.current = importPaths;

  const extractAudio = async () => {
    if (!isTauriRuntime) {
      showToast("提取音频仅在桌面版可用");
      return;
    }
    const source =
      [visibleAssets.find((item) => item.id === selectedAssetId), selectedClip?.assetId ? visibleAssets.find((item) => item.id === selectedClip.assetId) : undefined]
        .find((item) => item && item.kind === "video" && !item.isImage && item.path) ?? null;
    if (!source?.path) {
      showToast("请先在素材库选中一个带音轨的视频");
      return;
    }
    try {
      showToast(`正在从「${source.name}」提取音频…`);
      const [{ invoke }] = await Promise.all([import("@tauri-apps/api/core")]);
      const output = await invoke<string>("extract_audio", { input: source.path });
      const url = await localFileUrl(output);
      const duration = await probeVideoDuration(url);
      const asset: Asset = {
        id: `extract-${Date.now().toString(36)}`,
        name: `${source.name.replace(/\.[^.]+$/, "")} · 音频.m4a`,
        meta: "提取音频",
        duration: duration ? formatClock(duration) : "—",
        kind: "audio",
        tone: "voice",
        tag: "提取音频",
        url,
        path: output,
      };
      commitImported([asset], [], 1);
      setActiveTab("audio");
      showToast(`已提取音频「${asset.name}」`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error));
    }
  };

  const finishRecording = async () => {
    setRecording(false);
    recordStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordStreamRef.current = null;
    recorderRef.current = null;
    const blob = new Blob(recordChunksRef.current, { type: "audio/webm" });
    recordChunksRef.current = [];
    if (blob.size < 1024) {
      showToast("录音为空，请检查麦克风");
      return;
    }
    if (!isTauriRuntime) {
      showToast("录音保存仅在桌面版可用");
      return;
    }
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const { invoke } = await import("@tauri-apps/api/core");
      const path = await invoke<string>("save_audio_bytes", {
        base64: bytesToBase64(bytes),
        extension: "webm",
      });
      const url = await localFileUrl(path);
      const file = new File([blob], `录音-${Date.now().toString(36)}.webm`, { type: "audio/webm" });
      const newAnalyses: AudioAnalysisResult[] = [];
      let durationSeconds: number | null = null;
      try {
        const analysis = await analyzeAudioFile(file);
        newAnalyses.push(analysis);
        durationSeconds = analysis.duration_ms / 1000;
      } catch {
        durationSeconds = await probeVideoDuration(url);
      }
      const asset: Asset = {
        id: `record-${Date.now().toString(36)}`,
        name: file.name,
        meta: `${(blob.size / 1024 / 1024).toFixed(1)} MB · 录音`,
        duration: durationSeconds ? formatClock(durationSeconds) : "—",
        kind: "audio",
        tone: "voice",
        tag: "录音",
        url,
        path,
        sizeBytes: blob.size,
      };
      commitImported([asset], newAnalyses, 1);
      setActiveTab("audio");
      showToast("录音已加入素材库");
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error));
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      showToast("当前环境不支持录音");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordStreamRef.current = stream;
      recordChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        void finishRecording();
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      showToast("开始录音 · 再次点击「录音」结束");
    } catch {
      showToast("无法访问麦克风，请检查系统权限");
    }
  };

  const insertCaptionCues = (
    cues: Array<{ start: number; end: number; text: string }>,
    source = "srt",
  ): number => {
    let targetTrackId =
      project.tracks.find((track) => track.kind === "text" && !track.locked)?.id ?? null;
    let inserted = 0;
    for (const cue of cues) {
      const clip: TrackClip = {
        id: `${source}-${Date.now().toString(36)}-${inserted}`,
        name: cue.text.slice(0, 16) || "字幕",
        text: cue.text,
        start: Number(cue.start.toFixed(3)),
        duration: Number(Math.max(0.4, cue.end - cue.start).toFixed(3)),
        kind: "text",
        tone: "title",
        textRole: "caption",
        textStyle: { size: 1, color: "white", position: "bottom" },
      };
      let result = targetTrackId
        ? store.execute({ type: "clip.insert", trackId: targetTrackId, clip })
        : null;
      if (!result?.ok) {
        result = store.execute({ type: "track.insertClip", kind: "text", clip });
        if (result.ok) {
          targetTrackId =
            store
              .getSnapshot()
              .tracks.find((track) => track.clips.some((item) => item.id === clip.id))?.id ??
            null;
        }
      }
      if (result.ok) {
        inserted += 1;
      }
    }
    return inserted;
  };

  const importSrt = async (file: File) => {
    const cues = parseSrt(await file.text());
    if (cues.length === 0) {
      showToast("没有解析到字幕条目，请检查 SRT 格式");
      return;
    }
    const inserted = insertCaptionCues(cues);
    if (inserted === 0) {
      showToast("字幕写入失败，请检查时间线是否锁定");
      return;
    }
    showToast(`已导入 ${inserted} 条字幕到时间线`);
  };

  const transcribeCaptions = async (assetId?: string): Promise<AgentActionResult> => {
    if (captionBusy) {
      return {
        ok: false,
        message: "正在识别字幕，请稍候",
        revision: store.getSnapshot().revision,
      };
    }
    const asset =
      (assetId ? userAssets.find((item) => item.id === assetId) : undefined) ??
      (selectedAssetId
        ? userAssets.find((item) => item.id === selectedAssetId)
        : undefined) ??
      (selectedClip?.assetId
        ? userAssets.find((item) => item.id === selectedClip.assetId)
        : undefined) ??
      userAssets.find((item) => item.path && !item.isImage);
    if (!asset?.path) {
      const message = "请先导入并选中一个带声音的视频或音频";
      showToast(message);
      return { ok: false, message, revision: store.getSnapshot().revision };
    }
    setCaptionBusy(true);
    try {
      showToast(`正在用本地模型识别「${asset.name}」…`);
      const cues = await transcribeAsset(asset.path);
      if (cues.length === 0) {
        const message = "没有识别到语音内容，请检查素材是否有对白";
        showToast(message);
        return { ok: false, message, revision: store.getSnapshot().revision };
      }
      const inserted = insertCaptionCues(cues, "asr");
      if (inserted === 0) {
        const message = "字幕写入失败，请检查时间线是否锁定";
        showToast(message);
        return { ok: false, message, revision: store.getSnapshot().revision };
      }
      const message = `已生成 ${inserted} 条字幕`;
      showToast(message);
      return { ok: true, message, revision: store.getSnapshot().revision };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(message);
      return { ok: false, message, revision: store.getSnapshot().revision };
    } finally {
      setCaptionBusy(false);
    }
  };

  const insertAsset = (asset: Asset) => {
    const kind = asset.kind;
    const length = Math.min(project.duration, Math.max(0.5, parseDuration(asset.duration) ?? 5));
    const start = Math.min(Math.max(0, playhead), Math.max(0, project.duration - length));
    const target = findFittingTrack(kind, start, length);

    const clip: TrackClip = {
      id: `clip-${asset.id}-${Date.now().toString(36)}`,
      name: asset.name,
      start: Number(start.toFixed(3)),
      duration: Number(length.toFixed(3)),
      kind,
      tone: asset.tone,
      assetId: asset.id,
    };
    const result = target
      ? runCommand({ type: "clip.insert", trackId: target.id, clip })
      : runCommand({ type: "track.insertClip", kind, clip });
    if (result.ok) {
      setSelectedClipId(clip.id);
      showToast(
        target
          ? `已将 ${asset.name} 插入 ${target.name} · ${start.toFixed(2)}s`
          : `已将 ${asset.name} 插入新轨道 · ${start.toFixed(2)}s`,
      );
    }
  };

  const openRenameAsset = (asset: Asset) => {
    setAssetNameDraft(asset.name);
    setAssetDialog({ asset, mode: "rename" });
  };

  const openDeleteAsset = (asset: Asset) => {
    setAssetDialog({ asset, mode: "delete" });
  };

  const performDeleteAsset = (asset: Asset) => {
    let removedClips = 0;
    for (const track of project.tracks) {
      if (!track.clips.some((clip) => clip.assetId === asset.id)) {
        continue;
      }
      const nextClips = track.clips.filter((clip) => clip.assetId !== asset.id);
      removedClips += track.clips.length - nextClips.length;
      runCommand({ type: "track.replace", trackId: track.id, clips: nextClips });
    }
    setUserAssets((current) => current.filter((item) => item.id !== asset.id));
    setAudioAnalyses((current) => current.filter((item) => item.file_name !== asset.name));
    if (selectedClip?.assetId === asset.id) {
      setSelectedClipId(null);
    }
    showToast(
      `已删除素材「${asset.name}」${removedClips > 0 ? `及 ${removedClips} 个片段` : ""}`,
    );
  };

  const commitAssetDialog = () => {
    if (!assetDialog) {
      return;
    }
    if (assetDialog.mode === "rename") {
      const nextName = assetNameDraft.trim();
      if (nextName && nextName !== assetDialog.asset.name) {
        setUserAssets((current) =>
          current.map((item) =>
            item.id === assetDialog.asset.id ? { ...item, name: nextName } : item,
          ),
        );
        setAudioAnalyses((current) =>
          current.map((item) =>
            item.file_name === assetDialog.asset.name
              ? { ...item, file_name: nextName }
              : item,
          ),
        );
        showToast(`已重命名为「${nextName}」`);
      }
    } else {
      performDeleteAsset(assetDialog.asset);
    }
    setAssetDialog(null);
  };

  const insertMusicTrack = async (track: BuiltinMusic) => {
    const assetId = `music-${track.id}`;
    let asset = userAssets.find((item) => item.id === assetId);
    if (!asset) {
      asset = await musicToAsset(track);
      setUserAssets((current) =>
        current.some((item) => item.id === assetId) ? current : [asset!, ...current],
      );
    }
    const start = Number(Math.max(0, Math.min(playhead, project.duration - 0.5)).toFixed(3));
    const duration = Number(
      Math.min(track.duration, Math.max(0.5, project.duration - start)).toFixed(3),
    );
    const clip: TrackClip = {
      id: `music-${track.id}-${Date.now().toString(36)}`,
      name: track.name,
      start,
      duration,
      kind: "audio",
      tone: "music",
      assetId,
      sourceIn: 0,
      volumeDb: -16,
      ducking: true,
      fadeIn: 0.4,
      fadeOut: 0.6,
    };
    let result = runCommand({ type: "clip.insert", trackId: "track-a1", clip });
    if (!result.ok) {
      result = runCommand({ type: "track.insertClip", kind: "audio", clip });
    }
    if (result.ok) {
      setSelectedClipId(clip.id);
      showToast(`已添加内置音乐「${track.name}」· ${track.bpm} BPM`);
    }
  };

  const insertSfx = async (
    effect: BuiltinSfx,
  ): Promise<{ ok: boolean; message: string }> => {
    const assetId = `sfx-${effect.id}`;
    let asset = userAssets.find((item) => item.id === assetId);
    if (!asset) {
      asset = await sfxToAsset(effect);
      setUserAssets((current) =>
        current.some((item) => item.id === assetId) ? current : [asset!, ...current],
      );
    }
    const start = Number(Math.max(0, Math.min(playhead, project.duration - 0.2)).toFixed(3));
    const duration = Number(
      Math.min(effect.duration, Math.max(0.1, project.duration - start)).toFixed(3),
    );
    const clip: TrackClip = {
      id: `sfx-${effect.id}-${Date.now().toString(36)}`,
      name: effect.name,
      start,
      duration,
      kind: "audio",
      tone: "sfx",
      assetId,
      sourceIn: 0,
      volumeDb: -6,
    };
    let result = runCommand({ type: "clip.insert", trackId: "track-a2", clip });
    if (!result.ok) {
      result = runCommand({ type: "track.insertClip", kind: "audio", clip });
    }
    if (result.ok) {
      setSelectedClipId(clip.id);
      const message = `已添加音效「${effect.name}」· ${start.toFixed(2)}s`;
      showToast(message);
      return { ok: true, message };
    }
    return { ok: false, message: "音效插入失败，请检查音频轨道是否被锁定" };
  };

  const speakText = async (text: string, rate = 0): Promise<AgentActionResult> => {
    const content = text.trim();
    if (!content) {
      return { ok: false, message: "配音文本为空", revision: store.getSnapshot().revision };
    }
    try {
      showToast("正在用系统语音合成配音…");
      const speech = await synthesizeSpeech(content, rate);
      const asset = await speechToAsset(content, speech);
      setUserAssets((current) => [asset, ...current]);
      const start = Number(Math.max(0, Math.min(playhead, project.duration - 0.5)).toFixed(3));
      const duration = Number(
        Math.min(Math.max(0.5, speech.duration), Math.max(0.5, project.duration - start)).toFixed(3),
      );
      const clip: TrackClip = {
        id: `tts-${Date.now().toString(36)}`,
        name: asset.name,
        start,
        duration,
        kind: "audio",
        tone: "voice",
        assetId: asset.id,
        sourceIn: 0,
        volumeDb: 0,
      };
      let result = runCommand({ type: "clip.insert", trackId: "track-a2", clip });
      if (!result.ok) {
        result = runCommand({ type: "track.insertClip", kind: "audio", clip });
      }
      if (result.ok) {
        setSelectedClipId(clip.id);
        showToast(`已生成配音「${asset.name}」· ${duration.toFixed(1)} 秒`);
      }
      return {
        ok: result.ok,
        message: result.ok ? `已生成 ${duration.toFixed(1)} 秒配音` : result.error ?? "配音插入失败",
        revision: store.getSnapshot().revision,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(message);
      return { ok: false, message, revision: store.getSnapshot().revision };
    }
  };

  const runQuickCut = async (
    options: QuickCutRequest = {},
  ): Promise<AgentActionResult> => {
    if (quickCutBusy) {
      return { ok: false, message: "正在快剪，请稍候", revision: store.getSnapshot().revision };
    }
    const sources = userAssets.filter(
      (asset) => asset.path && (asset.kind === "video" || asset.isImage),
    );
    if (sources.length === 0) {
      const message = "请先导入视频素材，再使用一键快剪";
      showToast(message);
      return { ok: false, message, revision: store.getSnapshot().revision };
    }

    const runId = `quickcut-run-${Date.now().toString(36)}`;
    const checkpoint = store.checkpoint();
    setQuickCutBusy(true);
    setAgentTab("chat");
    setAgentOpen(true);
    try {
      showToast("正在分析素材的镜头切换与停顿…");
      const materials: QuickCutMaterial[] = [];
      for (const asset of sources.slice(0, 8)) {
        if (asset.isImage) {
          materials.push({ assetId: asset.id, duration: 3, scenes: [], silences: [], still: true });
          continue;
        }
        const fallback = parseDuration(asset.duration) ?? 5;
        try {
          const analysis = await analyzeMaterial(asset.path!);
          materials.push({
            assetId: asset.id,
            duration: analysis.duration > 0.3 ? analysis.duration : fallback,
            scenes: analysis.scenes,
            silences: analysis.silences,
          });
        } catch {
          materials.push({ assetId: asset.id, duration: fallback, scenes: [], silences: [] });
        }
      }

      const library = options.music === false ? [] : await listBuiltinMusic();
      const music = library.find((track) => track.bpm >= 90) ?? library[0] ?? null;
      const shots = planQuickCut(materials, {
        targetDuration: options.targetDuration ?? 30,
        bpm: music?.bpm ?? null,
      });
      if (shots.length === 0) {
        throw new Error("没有可用的镜头，请导入更长的视频素材");
      }

      const stamp = Date.now().toString(36);
      const videoClips: TrackClip[] = [];
      const windows: QuickCutWindow[] = [];
      let cursor = 0;
      shots.forEach((shot, index) => {
        const asset = userAssets.find((item) => item.id === shot.assetId);
        const start = Number(cursor.toFixed(3));
        videoClips.push({
          id: `quick-${stamp}-${index}`,
          name: `${asset?.name ?? "镜头"} ${index + 1}`,
          start,
          duration: shot.duration,
          kind: "video",
          tone: asset?.tone ?? "wave",
          assetId: shot.assetId,
          sourceIn: shot.sourceIn,
          fadeIn: index === 0 ? 0.2 : undefined,
          fadeOut: index === shots.length - 1 ? 0.3 : undefined,
        });
        windows.push({ start, duration: shot.duration, sourceStart: start });
        cursor += shot.duration;
      });
      const total = Number(cursor.toFixed(3));

      let videoTrack = project.tracks.find((track) => track.id === "track-v1");
      if (!videoTrack) {
        runCommand({ type: "track.add", kind: "video" });
        videoTrack = store.getSnapshot().tracks.find((track) => track.kind === "video");
      }
      const applied = videoTrack
        ? runCommand({ type: "track.replace", trackId: videoTrack.id, clips: videoClips })
        : { ok: false, error: "时间线上没有可用的视频轨道" };
      if (!applied.ok) {
        throw new Error(applied.error ?? "写入时间线失败");
      }

      // 清掉上一次快剪留下的配乐与字幕，避免叠加
      for (const clip of project.tracks.flatMap((track) => track.clips)) {
        if (clip.id.startsWith("quick-music-") || clip.id.startsWith("quickcut-")) {
          runCommand({ type: "clip.delete", clipId: clip.id });
        }
      }

      if (music) {
        const musicAssetId = `music-${music.id}`;
        if (!userAssets.some((item) => item.id === musicAssetId)) {
          const asset = await musicToAsset(music);
          setUserAssets((current) =>
            current.some((item) => item.id === musicAssetId) ? current : [asset, ...current],
          );
        }
        const musicClip: TrackClip = {
          id: `quick-music-${stamp}`,
          name: music.name,
          start: 0,
          duration: Number(Math.min(music.duration, total).toFixed(3)),
          kind: "audio",
          tone: "music",
          assetId: musicAssetId,
          volumeDb: -16,
          ducking: true,
          fadeIn: 0.4,
          fadeOut: 0.8,
        };
        const placed = runCommand({ type: "clip.insert", trackId: "track-a1", clip: musicClip });
        if (!placed.ok) {
          runCommand({ type: "track.insertClip", kind: "audio", clip: musicClip });
        }
      }

      if (options.vertical !== undefined) {
        setRenderSettings((current) =>
          options.vertical
            ? { ...current, width: 1080, height: 1920 }
            : { ...current, width: 1920, height: 1080 },
        );
      }

      setPlayhead(0);
      setSelectedClipId(videoClips[0]?.id ?? null);
      showToast(`已快剪 ${shots.length} 个镜头 · 约 ${total.toFixed(1)} 秒`);

      let captionCount = 0;
      if (options.captions !== false) {
        showToast("正在用本地模型生成字幕…");
        const asrSegments: Array<{ path: string; start: number; duration: number }> = [];
        const asrWindows: QuickCutWindow[] = [];
        let asrCursor = 0;
        shots.forEach((shot, index) => {
          const asset = userAssets.find((item) => item.id === shot.assetId);
          if (!asset?.path || asset.isImage) {
            return;
          }
          asrSegments.push({ path: asset.path, start: shot.sourceIn, duration: shot.duration });
          asrWindows.push({
            start: windows[index].start,
            duration: shot.duration,
            sourceStart: Number(asrCursor.toFixed(3)),
          });
          asrCursor += shot.duration;
        });
        if (asrSegments.length > 0) {
          try {
            const cues = await transcribeSegments(asrSegments);
            captionCount = insertCaptionCues(mapCuesToTimeline(cues, asrWindows), "quickcut");
          } catch {
            captionCount = 0;
          }
        }
      }

      runCheckpointsRef.current.set(runId, checkpoint);
      const summary = [
        `已用 ${sources.length} 个素材快剪出 ${shots.length} 个镜头，总长 ${total.toFixed(1)} 秒。`,
        music ? `配乐：${music.name}（${music.bpm} BPM，按节拍踩点）` : "本次没有添加配乐。",
        captionCount > 0 ? `字幕：${captionCount} 条（本地模型识别）` : "",
        options.vertical === true
          ? "输出：1080×1920 竖屏，画面居中裁切填满屏幕。"
          : options.vertical === false
            ? "输出：1920×1080 横屏。"
            : "",
        "不满意可以点下面的「撤销本次修改」还原。",
      ].filter(Boolean);
      setMessages((current) => [
        ...current,
        {
          id: runId,
          role: "assistant",
          text: summary.join("\n"),
          status: "done",
          startedAt: Date.now(),
          endedAt: Date.now(),
          canUndo: true,
        },
      ]);
      return {
        ok: true,
        message: `快剪完成：${shots.length} 个镜头，约 ${total.toFixed(1)} 秒`,
        revision: store.getSnapshot().revision,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      store.restore(checkpoint);
      showToast(message);
      setMessages((current) => [
        ...current,
        {
          id: runId,
          role: "assistant",
          text: `一键快剪没有完成：${message}`,
          status: "error",
          startedAt: Date.now(),
          endedAt: Date.now(),
        },
      ]);
      return { ok: false, message, revision: store.getSnapshot().revision };
    } finally {
      setQuickCutBusy(false);
    }
  };

  const analyzeFootage = async (): Promise<FootageAnalysis[]> => {
    const sources = userAssets.filter(
      (asset) => asset.kind === "video" && asset.path && !asset.isImage,
    );
    const results: FootageAnalysis[] = [];
    const targets = sources.slice(0, 12);
    for (const asset of targets) {
      try {
        const analysis = await analyzeMaterial(asset.path!, { quality: true });
        results.push({ ...analysis, assetId: asset.id, name: asset.name });
      } catch {
        // 单个素材分析失败不影响其他素材
      }
    }
    if (targets.length > 0 && results.length === 0) {
      throw new Error(
        `素材分析失败：${targets.length} 个视频都无法读取，请确认文件仍在原位置且格式受支持`,
      );
    }
    return results;
  };

  const runStoryPlan = async (style: StoryStyle = "cinematic") => {
    if (storyBusy) return;
    if (userAssets.every((asset) => asset.kind !== "video" || asset.isImage)) {
      showToast("请先导入视频素材，再生成精剪方案");
      return;
    }
    setStoryBusy(true);
    showToast("正在分析素材质量并规划叙事结构…");
    try {
      const analyses = await analyzeFootage();
      const plan = buildStoryPlan(analyses, { targetDuration: 30, style });
      if (plan.shots.length === 0) {
        showToast("素材里没有达到质量要求的可用镜头");
        return;
      }
      const result = proposePlan(
        plan.shots.map((shot) => ({
          asset_id: shot.assetId,
          title: shot.title,
          note: `${shot.beat} · ${shot.note}`,
          duration: shot.duration,
          source_in: shot.sourceIn,
          beat: shot.beat,
          look: shot.look,
          transition: shot.transition,
        })),
      );
      showToast(
        result.ok
          ? `已生成「${plan.styleLabel}」方案 · ${plan.shots.length} 个镜头 · 约 ${plan.totalDuration.toFixed(1)} 秒`
          : (result.message ?? "方案生成失败"),
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error));
    } finally {
      setStoryBusy(false);
    }
  };

  const reviewTimeline = async (): Promise<ReviewTimelineResult> => {
    if (reviewBusy) {
      return { ok: false, message: "正在审片，请稍候" };
    }
    if (allClips.length === 0) {
      const message = "时间线为空，先剪点内容再审片";
      showToast(message);
      return { ok: false, message };
    }
    setReviewBusy(true);
    showToast("正在渲染低清预览并审片…");
    try {
      const base = renderSettingsRef.current;
      const contentEnd = allClips.reduce(
        (max, clip) => Math.max(max, clip.start + clip.duration),
        0,
      );
      const settings = {
        ...base,
        rangeStart: Math.min(base.rangeStart, Math.max(0, contentEnd - 0.1)),
        rangeEnd:
          base.rangeEnd > base.rangeStart + 0.05
            ? Math.min(base.rangeEnd, contentEnd)
            : contentEnd,
      };
      const { path, report } = await renderAndReview(project, userAssets, settings);
      setReviewReport(report);
      showToast(`审片完成：${report.score} 分 · ${reviewGrade(report.score).label}`);
      return { ok: true, path, report, message: formatReview(report) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast(message);
      return { ok: false, message };
    } finally {
      setReviewBusy(false);
    }
  };

  const reviewVideo = async (path: string): Promise<ReviewReport> => {
    const report = await reviewVideoFile(path);
    setReviewReport(report);
    return report;
  };

  const applyScriptToTimeline = async (doc: ScriptDoc) => {
    if (pickScriptAssets(visibleAssets).length === 0) {
      showToast("请先在左侧导入视频或图片素材，再套用脚本");
      return;
    }
    const { videoClips, textClips, trimmedShots } = buildScriptClips(doc, visibleAssets);
    if (videoClips.length === 0) {
      showToast("脚本里没有可用镜头");
      return;
    }

    // 同一个脚本重复套用时，先清掉上一次生成的画面和字幕，避免轨道叠加或字幕重叠
    const prefix = `script-${doc.id}-`;
    const snapshot = store.getSnapshot();
    for (const track of snapshot.tracks) {
      for (const clip of track.clips) {
        if (clip.id.startsWith(prefix)) {
          store.execute({ type: "clip.delete", clipId: clip.id });
        }
      }
    }

    const trackName = `脚本 · ${doc.title.slice(0, 6)}`;
    let videoTrackId =
      store
        .getSnapshot()
        .tracks.find((track) => track.kind === "video" && track.name === trackName && !track.locked)
        ?.id ?? null;
    if (!videoTrackId) {
      const before = new Set(store.getSnapshot().tracks.map((track) => track.id));
      const added = store.execute({ type: "track.add", kind: "video", name: trackName });
      if (!added.ok) {
        showToast(added.error ?? "无法创建视频轨道");
        return;
      }
      videoTrackId =
        store
          .getSnapshot()
          .tracks.find((track) => !before.has(track.id) && track.kind === "video")?.id ?? null;
    }
    if (!videoTrackId) {
      showToast("无法创建视频轨道");
      return;
    }

    let inserted = 0;
    for (const clip of videoClips) {
      if (store.execute({ type: "clip.insert", trackId: videoTrackId, clip }).ok) {
        inserted += 1;
      }
    }
    if (inserted === 0) {
      showToast("脚本写入失败，请检查轨道是否锁定");
      return;
    }

    let textTrackId =
      store.getSnapshot().tracks.find((track) => track.kind === "text" && !track.locked)?.id ??
      null;
    for (const clip of textClips) {
      let result = textTrackId
        ? store.execute({ type: "clip.insert", trackId: textTrackId, clip })
        : null;
      if (!result?.ok) {
        result = store.execute({ type: "track.insertClip", kind: "text", clip });
        if (result.ok) {
          textTrackId =
            store
              .getSnapshot()
              .tracks.find((track) => track.clips.some((item) => item.id === clip.id))?.id ??
            null;
        }
      }
    }

    setPlayhead(0);
    setAgentOpen(false);
    showToast(
      `已套用「${doc.title}」· ${inserted} 个镜头${trimmedShots > 0 ? ` · ${trimmedShots} 个镜头按素材长度收窄` : ""}`,
    );
  };

  const normalizeRenderSettings = (
    settings?: Partial<RenderSettings>,
  ): RenderSettings => {
    const activeSettings: RenderSettings = {
      ...renderSettingsRef.current,
      ...settings,
    };
    activeSettings.rangeStart = Math.max(0, Math.min(activeSettings.rangeStart, project.duration));
    activeSettings.rangeEnd = Math.max(
      activeSettings.rangeStart,
      Math.min(activeSettings.rangeEnd, project.duration),
    );
    return activeSettings;
  };

  const buildExportPayload = (activeSettings: RenderSettings) => ({
    ...project,
    render_plan: {
      width: activeSettings.width,
      height: activeSettings.height,
      fps: activeSettings.fps,
      format: activeSettings.format,
      bitrate: activeSettings.bitrate,
      burn_subtitles: activeSettings.burnSubtitles,
      vertical: activeSettings.height > activeSettings.width,
      range_start: activeSettings.rangeStart,
      range_end: activeSettings.rangeEnd,
      video_codec: "h264",
      audio_codec: "aac",
      audio_lufs: -14,
      tracks: project.tracks.map((track) => ({
        id: track.id,
        kind: track.kind,
        muted: Boolean(track.muted),
        clips: track.clips.map((clip) => ({
          id: clip.id,
          asset_id: clip.assetId,
          name: clip.name,
          start: clip.start,
          duration: clip.duration,
          source_in: clip.sourceIn ?? 0,
          speed: clip.speed ?? 1,
          volume_db: clip.volumeDb ?? 0,
          opacity: clip.opacity ?? 1,
          fade_in: clip.fadeIn ?? 0,
          fade_out: clip.fadeOut ?? 0,
          text_style: clip.textStyle,
          ducking: Boolean(clip.ducking),
          denoise: Boolean(clip.denoise),
          normalized: Boolean(clip.normalized),
          eq: clip.eq,
          sync_offset: clip.syncOffset ?? 0,
          transition_in: clip.transitionIn,
          transition_out: clip.transitionOut,
          keyframes: clip.keyframes,
          group_id: clip.groupId,
          filter: clip.filter,
          adjust: clip.adjust,
        })),
      })),
    },
    audio_analyses: audioAnalyses,
    exported_at: new Date().toISOString(),
  });

  const downloadJson = (filename: string, payload: unknown) => {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      anchor.remove();
    }, 30000);
    return json;
  };

  const exportProject = async (
    settings?: Partial<RenderSettings>,
  ): Promise<AgentActionResult> => {
    const activeSettings = normalizeRenderSettings(settings);
    setRenderSettings(activeSettings);

    if (!isTauriRuntime) {
      downloadJson(`${project.name}.ocproj.json`, buildExportPayload(activeSettings));
      const message =
        "浏览器预览不支持渲染 MP4，已导出渲染清单；桌面版会调用 FFmpeg 导出真实视频。";
      showToast(message);
      return { ok: true, message, revision: project.revision };
    }
    if (rendering) {
      return { ok: false, message: "正在导出，请稍候", revision: project.revision };
    }

    try {
      const request = buildRenderRequest(project, userAssets, activeSettings);
      const extension = activeSettings.format === "webm" ? "webm" : "mp4";
      const output = await saveVideoDialog(`${project.name}.${extension}`, activeSettings.format);
      if (!output) {
        return { ok: false, message: "已取消导出", revision: project.revision };
      }
      setRendering(true);
      showToast("正在用 FFmpeg 渲染，请稍候…");
      const message = await renderVideoFile(request, output);
      showToast(message);
      return { ok: true, message, revision: project.revision };
    } catch (error) {
      const message = error instanceof Error ? error.message : "导出失败";
      showToast(message);
      return { ok: false, message, revision: project.revision };
    } finally {
      setRendering(false);
    }
  };

  const exportBatch = async (
    jobs: Array<Partial<RenderSettings>>,
  ): Promise<AgentActionResult> => {
    const list = jobs.length > 0 ? jobs : [{}];
    const originalSettings = renderSettingsRef.current;
    let succeeded = 0;
    const failures: string[] = [];
    for (let index = 0; index < list.length; index += 1) {
      const result = await exportProject(list[index]);
      if (result.ok) {
        succeeded += 1;
        continue;
      }
      failures.push(`第 ${index + 1} 个任务：${result.message}`);
      if (result.message === "已取消导出") {
        break;
      }
    }
    setRenderSettings(originalSettings);
    const message =
      failures.length === 0
        ? `批量导出完成：共 ${succeeded} 个视频`
        : succeeded > 0
          ? `批量导出完成：成功 ${succeeded} 个，失败 ${failures.length} 个（${failures.join("；")}）`
          : `批量导出失败：${failures.join("；")}`;
    showToast(message);
    return {
      ok: succeeded > 0 && failures.length === 0,
      message,
      revision: project.revision,
    };
  };

  const saveProject = async (saveAs = false): Promise<boolean> => {
    const contents = serializeProjectFile(
      project,
      userAssets,
      renderSettings,
      planShots,
      audioAnalysesRef.current,
    );
    if (!isTauriRuntime) {
      downloadJson(`${project.name}.ocproj.json`, JSON.parse(contents));
      setSavedRevision(project.revision);
      showToast("工程文件已下载");
      return true;
    }
    try {
      let target = projectPath;
      if (saveAs || !target) {
        target = await saveProjectDialog(`${project.name}.ocproj.json`, contents);
        if (!target) {
          return false;
        }
        setProjectPath(target);
      } else {
        await writeProjectFile(target, contents);
      }
      setSavedRevision(project.revision);
      showToast("工程已保存");
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "保存工程失败");
      return false;
    }
  };

  const loadProject = async (contents: string, path: string | null) => {
    try {
      const file = parseProjectFile(contents);
      const restored: Asset[] = [];
      for (const asset of file.assets) {
        let url = asset.url;
        if (asset.path && isTauriRuntime) {
          try {
            url = await localFileUrl(asset.path);
          } catch {
            url = undefined;
          }
        }
        restored.push({ ...asset, url });
      }
      store.loadProject(file.project);
      setUserAssets(restored);
      setPlanShots(file.plan_shots);
      setAudioAnalyses(file.audio_analyses ?? []);
      setRenderSettings(file.render_settings);
      const fileEnd = file.project.tracks
        .flatMap((track) => track.clips)
        .reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0);
      autoRangeRef.current = Math.abs(file.render_settings.rangeEnd - fileEnd) < 0.2;
      setApplied(false);
      setSelectedAssetId(null);
      setSelectedClipId(null);
      setPlayhead(0);
      setProjectPath(path);
      setSavedRevision(file.project.revision);
      showToast(`已打开工程 · ${file.project.name}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "打开工程失败");
    }
  };

  const persistDraft = async (): Promise<boolean> => {
    if (!draftId || !draftReady) {
      return false;
    }
    const meta = buildDraftMeta({
      id: draftId,
      name: project.name,
      createdAt: draftMetaRef.current?.createdAt ?? new Date().toISOString(),
      project,
      assets: userAssets,
    });
    const contents = buildDraftContents({
      meta,
      project,
      assets: userAssets,
      renderSettings,
      planShots,
      audioAnalyses: audioAnalysesRef.current,
    });
    draftMetaRef.current = await saveDraft(meta, contents);
    return true;
  };

  useEffect(() => {
    if (!draftId || draftLoadedRef.current) {
      return;
    }
    draftLoadedRef.current = true;
    void (async () => {
      const record = await readDraft(draftId);
      if (!record) {
        const meta = emptyDraftMeta(draftId);
        const fresh = { ...createInitialProject(), name: meta.name };
        store.loadProject(fresh);
        const contents = buildDraftContents({
          meta,
          project: fresh,
          assets: [],
          renderSettings: renderSettingsRef.current,
          planShots: [],
        });
        draftMetaRef.current = await saveDraft(meta, contents);
        setDraftReady(true);
        return;
      }
      try {
        const file = parseProjectFile(record.contents);
        const restored: Asset[] = [];
        for (const asset of file.assets) {
          let url = asset.url;
          if (asset.path && isTauriRuntime) {
            try {
              url = await localFileUrl(asset.path);
            } catch {
              url = undefined;
            }
          }
          restored.push({ ...asset, url });
        }
        store.loadProject(file.project);
        setUserAssets(restored);
        setPlanShots(file.plan_shots);
        setAudioAnalyses(file.audio_analyses ?? []);
        setRenderSettings(file.render_settings);
        const fileEnd = file.project.tracks
          .flatMap((track) => track.clips)
          .reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0);
        autoRangeRef.current = Math.abs(file.render_settings.rangeEnd - fileEnd) < 0.2;
        setApplied(false);
        setSelectedAssetId(null);
        setSelectedClipId(null);
        setPlayhead(0);
        setProjectPath(null);
        setSavedRevision(file.project.revision);
        draftMetaRef.current = record.meta;
        setDraftReady(true);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "草稿读取失败");
        setDraftReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, store]);

  useEffect(() => {
    if (!draftId || !draftReady) {
      return;
    }
    const timer = window.setTimeout(() => {
      void persistDraft();
    }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, draftReady, project, userAssets, renderSettings, planShots]);

  const goHome = async () => {
    try {
      await persistDraft();
    } catch {
      showToast("草稿保存失败，请检查磁盘空间");
    }
    onBackHome?.();
  };

  const confirmDiscard = () =>
    !dirty || draftId !== undefined || window.confirm("当前工程有未保存的修改，确定要放弃吗？");

  const openProject = async () => {
    if (!confirmDiscard()) {
      return;
    }
    if (!isTauriRuntime) {
      projectInputRef.current?.click();
      return;
    }
    try {
      const result = await openProjectDialog();
      if (result) {
        await loadProject(result.contents, result.path);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "打开工程失败");
    }
  };

  const newProject = () => {
    if (!confirmDiscard()) {
      return;
    }
    store.loadProject(createInitialProject());
    setUserAssets([]);
    setPlanShots([]);
    setRenderSettings({ ...initialRenderSettings, rangeEnd: 0 });
    autoRangeRef.current = true;
    setApplied(false);
    setSelectedAssetId(null);
    setSelectedClipId(null);
    setPlayhead(0);
    setProjectPath(null);
    setSavedRevision(0);
    showToast("已新建工程");
  };

  const toggleMaximize = async () => {
    if (!isTauriRuntime) {
      setMaximized((value) => !value);
      return;
    }
    const {
      currentMonitor,
      getCurrentWindow,
      LogicalPosition,
      LogicalSize,
      PhysicalPosition,
      PhysicalSize,
    } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    if (maximized) {
      const bounds = restoreBoundsRef.current;
      if (bounds) {
        await appWindow.setSize(new PhysicalSize(bounds.width, bounds.height));
        await appWindow.setPosition(new PhysicalPosition(bounds.x, bounds.y));
      }
      setMaximized(false);
      return;
    }
    const [monitor, size, position] = await Promise.all([
      currentMonitor(),
      appWindow.innerSize(),
      appWindow.outerPosition(),
    ]);
    restoreBoundsRef.current = {
      width: size.width,
      height: size.height,
      x: position.x,
      y: position.y,
    };
    if (monitor) {
      const scale = monitor.scaleFactor || 1;
      const area = monitor.workArea;
      await appWindow.setSize(
        new LogicalSize(area.size.width / scale, area.size.height / scale),
      );
      await appWindow.setPosition(
        new LogicalPosition(area.position.x / scale, area.position.y / scale),
      );
    }
    setMaximized(true);
  };

  const startResize = (side: "left" | "right", event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startValue = side === "left" ? leftWidth : rightWidth;

    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      if (side === "left") {
        setLeftWidth(Math.min(360, Math.max(240, startValue + delta)));
      } else {
        setRightWidth(Math.min(430, Math.max(300, startValue - delta)));
      }
    };

    const onUp = () => {
      document.body.classList.remove("is-resizing");
      window.removeEventListener("pointermove", onMove);
    };

    document.body.classList.add("is-resizing");
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const selectClip = (clip: TrackClip | null, additive = false) => {
    if (!clip) {
      setSelectedClipIds([]);
      return;
    }
    const groupIds = clip.groupId
      ? allClips
          .filter((item) => item.groupId === clip.groupId && item.id !== clip.id)
          .map((item) => item.id)
      : [];
    const targetIds = [...groupIds, clip.id];
    if (!additive) {
      setSelectedClipIds(targetIds);
      return;
    }
    setSelectedClipIds((current) => {
      const allSelected = targetIds.every((id) => current.includes(id));
      if (allSelected) {
        return current.filter((id) => !targetIds.includes(id));
      }
      return Array.from(new Set([...current, ...targetIds]));
    });
  };

  const groupSelectedClips = () => {
    if (selectedClipIds.length < 2) {
      return;
    }
    const groupId = `group-${Date.now().toString(36)}`;
    const result = runCommand({
      type: "clip.group",
      clipIds: selectedClipIds,
      groupId,
    });
    if (result.ok) {
      showToast(`已组合 ${selectedClipIds.length} 个片段`);
    }
  };

  const ungroupSelectedClips = () => {
    const groupIds = Array.from(
      new Set(
        selectedClipIds
          .map((id) => allClips.find((clip) => clip.id === id)?.groupId)
          .filter((groupId): groupId is string => Boolean(groupId)),
      ),
    );
    if (groupIds.length === 0) {
      showToast("所选片段没有组合");
      return;
    }
    for (const groupId of groupIds) {
      const clipIds = allClips
        .filter((clip) => clip.groupId === groupId)
        .map((clip) => clip.id);
      runCommand({ type: "clip.group", clipIds, groupId: null });
    }
    showToast(`已取消 ${groupIds.length} 个组合`);
  };

  const selectCaption = (cue: CaptionCue) => {
    setPlayhead(cue.start);
    setSelectedClipId(cue.id);
  };

  const proposePlan = (shots: ProposedShot[]): AgentActionResult => {
    const plan: PlanShot[] = [];
    let cursor = 0;
    for (const shot of shots) {
      if (cursor >= project.duration) {
        break;
      }
      const asset = shot.asset_id
        ? userAssets.find((item) => item.id === shot.asset_id)
        : undefined;
      if (!asset) {
        continue;
      }
      const duration = Math.min(
        Math.max(0.5, Number(shot.duration) || 3),
        project.duration - cursor,
      );
      const start = cursor;
      cursor += duration;
      plan.push({
        id: `shot-${plan.length + 1}`,
        range: `${formatClock(start)} — ${formatClock(cursor)}`,
        title: shot.title,
        note: shot.note ?? "",
        tone: shot.tone ?? asset.tone,
        duration: `${duration.toFixed(1)}s`,
        assetId: asset.id,
        sourceIn: shot.source_in,
        speed: shot.speed,
        transition: shot.transition,
        beat: shot.beat,
        look: shot.look,
      });
    }
    if (plan.length === 0) {
      return {
        ok: false,
        message: "方案没有引用素材库中真实存在的素材，已拒绝。请先导入素材再生成方案。",
        revision: project.revision,
      };
    }
    setPlanShots(plan);
    setApplied(false);
    return {
      ok: true,
      message: `已生成 ${plan.length} 个镜头的方案，等待用户确认`,
      revision: project.revision,
    };
  };

  const commands: PaletteCommand[] = [
    { id: "import-media", group: "文件", label: "导入素材", hint: "视频或音频", run: () => void importMedia() },
    { id: "new-project", group: "文件", label: "新建工程", hint: "Ctrl N", run: newProject },
    { id: "open-project", group: "文件", label: "打开工程", hint: "Ctrl O", run: () => void openProject() },
    { id: "save-project", group: "文件", label: "保存工程", hint: "Ctrl S", run: () => void saveProject() },
    { id: "save-project-as", group: "文件", label: "工程另存为", hint: "Ctrl Shift S", run: () => void saveProject(true) },
    { id: "export-video", group: "文件", label: "导出视频", hint: "Ctrl E", run: () => void exportProject() },
    { id: "open-settings", group: "文件", label: "打开设置", hint: "Ctrl ,", run: () => setSettingsOpen(true) },
    { id: "undo", group: "编辑", label: "撤销", hint: "Ctrl Z", run: undo },
    { id: "redo", group: "编辑", label: "重做", hint: "Ctrl Shift Z", run: redo },
    { id: "cut", group: "编辑", label: "剪切选中片段", hint: "Ctrl X", run: cutSelected },
    { id: "copy", group: "编辑", label: "复制选中片段", hint: "Ctrl C", run: copySelected },
    { id: "paste", group: "编辑", label: "粘贴片段到播放头", hint: "Ctrl V", run: pasteClip },
    { id: "split", group: "编辑", label: "分割选中片段", hint: "Ctrl B", run: splitSelected },
    { id: "ripple-delete", group: "编辑", label: "波纹删除选中片段", hint: "Shift Del", run: rippleDeleteSelected },
    { id: "add-marker", group: "编辑", label: "在播放头添加标记", run: () => runCommand({ type: "marker.add", time: playhead, label: "标记" }) },
    { id: "add-track", group: "编辑", label: "添加视频轨道", run: () => runCommand({ type: "track.add", kind: "video" }) },
    { id: "auto-cut", group: "AI", label: "自动精剪", hint: "让 AI 生成方案", run: handleAutoCut },
    { id: "tab-agent", group: "面板", label: "打开 AI 助手", run: () => { setAgentTab("chat"); setAgentOpen(true); } },
    { id: "tab-replica", group: "面板", label: "视频复刻", run: () => { setAgentTab("replica"); setAgentOpen(true); } },
    { id: "tab-script", group: "面板", label: "脚本库", run: () => { setAgentTab("script"); setAgentOpen(true); } },
    { id: "tab-media", group: "素材", label: "媒体面板", run: () => setActiveTab("media") },
    { id: "tab-audio", group: "素材", label: "音频面板", run: () => setActiveTab("audio") },
    { id: "tab-text", group: "素材", label: "文本面板", run: () => setActiveTab("text") },
    { id: "tab-stickers", group: "素材", label: "贴纸面板", run: () => setActiveTab("stickers") },
    { id: "tab-effects", group: "素材", label: "特效面板", run: () => setActiveTab("effects") },
    { id: "tab-transitions", group: "素材", label: "转场面板", run: () => setActiveTab("transitions") },
    { id: "tab-filters", group: "素材", label: "滤镜面板", run: () => setActiveTab("filters") },
    { id: "tab-adjust", group: "素材", label: "调节面板", run: () => setActiveTab("adjust") },
    { id: "tab-captions", group: "素材", label: "字幕面板", run: () => setActiveTab("captions") },
  ];

  runtimeRef.current = {
    getAudioAnalyses: () => audioAnalysesRef.current,
    getAssets: () => userAssets,
    getPlayhead: () => playhead,
    isPlaying: () => playing,
    getContext: () => ({
      selectedClipId,
      selectedAssetId,
      activeTab,
      playhead,
      playing,
    }),
    requestApproval,
    transcribeCaptions,
    runQuickCut,
    reviewTimeline,
    reviewVideo,
    analyzeFootage,
    listSfx: listBuiltinSfx,
    insertSfx: async (effect) => {
      const result = await insertSfx(effect);
      return { ...result, revision: store.getSnapshot().revision };
    },
    speak: speakText,
    seek: (time) => setPlayhead(Math.max(0, Math.min(project.duration, time))),
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    getRenderSettings: () => renderSettingsRef.current,
    updateRenderSettings: (patch) => {
      if (patch.rangeStart !== undefined || patch.rangeEnd !== undefined) {
        autoRangeRef.current = false;
      }
      setRenderSettings((current) => ({ ...current, ...patch }));
    },
    exportProject,
    exportBatch,
    proposePlan,
  };

  return (
    <div className="desktop">
      <div
        className={`app-window${maximized ? " is-maximized" : ""}`}
        style={
          {
            "--left-width": `${leftWidth}px`,
            "--right-width": `${rightWidth}px`,
          } as React.CSSProperties
        }
      >
        <WindowChrome
          projectName={projectFileLabel}
          maximized={maximized}
          dirty={draftId ? false : dirty}
          saveState={saveState}
          onBackHome={onBackHome ? () => void goHome() : undefined}
          aiOnline={aiOnline}
          aiKeySource={aiKeySource}
          canExport={allClips.length > 0}
          canUndo={store.canUndo}
          canRedo={store.canRedo}
          activeTool={activeTool}
          onToggleMaximize={() => void toggleMaximize()}
          onMinimize={() => {
            if (isTauriRuntime) {
              void import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
                getCurrentWindow().minimize(),
              );
              return;
            }
            showToast("桌面版会最小化到 Windows 任务栏");
          }}
          onClose={() => {
            if (!confirmDiscard()) {
              return;
            }
            if (isTauriRuntime) {
              void import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
                getCurrentWindow().close(),
              );
              return;
            }
            showToast("桌面版会关闭当前项目窗口");
          }}
          onAction={showToast}
          onOpenCommandPalette={() => setPaletteOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onExport={() => {
            void exportProject();
          }}
          onUndo={undo}
          onRedo={redo}
          onChangeTool={setActiveTool}
          onSplitSelected={splitSelected}
          onRippleDeleteSelected={rippleDeleteSelected}
          onCutSelected={cutSelected}
          onCopySelected={copySelected}
          onPasteClip={pasteClip}
          onZoomIn={() => setZoom((value) => Math.min(10, Number((value + 0.25).toFixed(2))))}
          onZoomOut={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))}
          onZoomFit={() => setZoom(1)}
          onAddTransitionSelected={addTransitionSelected}
          onAutoCut={handleAutoCut}
          onNewProject={newProject}
          onOpenProject={() => void openProject()}
          onSaveProject={() => void saveProject()}
          onSaveProjectAs={() => void saveProject(true)}
        />

        <div className="workspace">
          <AssetPanel
            assets={visibleAssets}
            captions={captions}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            selectedAssetId={selectedAssetId}
            selectedClip={selectedClip}
            onSelectAsset={setSelectedAssetId}
            onInsertAsset={insertAsset}
            onImport={importMedia}
            onSelectCaption={selectCaption}
            onApplyTransition={applyTransitionToSelected}
            onApplyFilter={applyFilterToSelected}
            onApplyEffect={applyFilterToSelected}
            onAdjustClip={adjustSelectedClip}
            onInsertTextPreset={(text, name, style) => insertTextClip(text, name, "title", style)}
            onInsertSticker={insertSticker}
            onApplySubtitlePreset={applySubtitlePreset}
            onExtractAudio={() => void extractAudio()}
            onRecordAudio={() => void toggleRecording()}
            recording={recording}
            onAutoCaption={() => void transcribeCaptions()}
            captionBusy={captionBusy}
            onInsertMusic={(track) => void insertMusicTrack(track)}
            onInsertSfx={(effect) => void insertSfx(effect)}
            onSpeak={(text) => void speakText(text)}
            onImportSrt={() => srtInputRef.current?.click()}
            onRenameAsset={openRenameAsset}
            onDeleteAsset={openDeleteAsset}
          />
          <div
            className="resize-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="调整素材面板宽度"
            data-agent-id="handle.left-panel"
            data-agent-role="separator"
            data-agent-label="调整素材面板宽度"
            onPointerDown={(event) => startResize("left", event)}
          />

          <PreviewStage
            duration={project.duration}
            playing={playing}
            playhead={playhead}
            width={renderSettings.width}
            height={renderSettings.height}
            fps={renderSettings.fps}
            format={renderSettings.format}
            previewUrl={previewAsset?.url}
            previewFilter={previewFilter}
            previewOverlays={previewOverlays}
            previewStart={activeVideoClip?.start ?? 0}
            previewSourceIn={activeVideoClip?.sourceIn ?? 0}
            previewSpeed={activeVideoClip?.speed ?? 1}
            previewScale={previewTransform?.scale ?? 1}
            previewRotation={previewTransform?.rotation ?? 0}
            previewPositionX={previewTransform?.positionX ?? 0}
            previewPositionY={previewTransform?.positionY ?? 0}
            previewMask={activeVideoClip?.mask ?? null}
            previewOpacity={previewTransform?.opacity ?? 1}
            backgrounds={backgroundLayers}
            blendMode={activeVideoClip?.blendMode ?? "normal"}
            previewMuted={previewMuted}
            previewVolume={previewVolume}
            previewIsImage={Boolean(previewAsset?.isImage)}
            previewDucked={previewDucked}
            audioLayers={previewAudioLayers}
            previewOverlay={previewOverlay}
            textLayers={activeTextClips}
            hasClips={allClips.length > 0}
            showCaptions={showCaptions}
            rendering={rendering}
            onTogglePlay={() => setPlaying((value) => !value)}
            onToggleCaptions={() => setShowCaptions((value) => !value)}
            onSeek={setPlayhead}
            onAction={showToast}
          />

          <div
            className="resize-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="调整 AI 面板宽度"
            data-agent-id="handle.right-panel"
            data-agent-role="separator"
            data-agent-label="调整 AI 面板宽度"
            onPointerDown={(event) => startResize("right", event)}
          />

          <InspectorPanel
            selectedClip={selectedClip}
            selectedCount={selectedClipIds.length}
            selectedTrackName={selectedTrack?.name ?? null}
            audioAnalysis={audioAnalysis}
            duration={project.duration}
            playhead={playhead}
            renderSettings={renderSettings}
            rendering={rendering}
            onAddKeyframe={(clipId, keyframe) =>
              runCommand({ type: "clip.keyframe", clipId, keyframe })
            }
            onRemoveKeyframe={(clipId, keyframeId) =>
              runCommand({ type: "clip.keyframeRemove", clipId, keyframeId })
            }
            onUpdateMask={(mask) => {
              if (selectedClipId) {
                runCommand({ type: "clip.update", clipId: selectedClipId, patch: { mask } });
              }
            }}
            onSpeedRamp={applySpeedRamp}
            onCustomSpeedRamp={applyCustomSpeedRamp}
            onGroupClips={groupSelectedClips}
            onUngroupClips={ungroupSelectedClips}
            onUpdateBlend={(mode) => {
              if (selectedClipId) {
                runCommand({
                  type: "clip.update",
                  clipId: selectedClipId,
                  patch: { blendMode: mode },
                });
              }
            }}
            onUpdateClip={(patch) => {
              if (!selectedClipId) {
                return;
              }
              const coalesceKey =
                patch.text !== undefined
                  ? `text:${selectedClipId}`
                  : patch.volumeDb !== undefined
                    ? `volume:${selectedClipId}`
                    : patch.textStyle
                      ? `text-style:${selectedClipId}`
                      : undefined;
              runCommand(
                { type: "clip.update", clipId: selectedClipId, patch },
                coalesceKey ? { coalesceKey } : undefined,
              );
            }}
            onUpdateTransform={updateSelectedTransform}
            onSetSpeed={(speed) => {
              if (selectedClipId) {
                runCommand(
                  { type: "clip.speed", clipId: selectedClipId, speed },
                  { coalesceKey: `speed:${selectedClipId}` },
                );
              }
            }}
            onUpdateRenderSettings={(patch) => {
              if (patch.rangeStart !== undefined || patch.rangeEnd !== undefined) {
                autoRangeRef.current = false;
              }
              setRenderSettings((current) => ({ ...current, ...patch }));
            }}
            onStartRender={() => {
              void exportProject();
            }}
            onStartBatchRender={() => {
              void exportBatch([
                {},
                { width: 1080, height: 1920, format: "webm", burnSubtitles: false },
              ]);
            }}
          />
        </div>

        <Timeline
          project={project}
          assets={visibleAssets}
          audioAnalyses={audioAnalyses}
          playhead={playhead}
          zoom={zoom}
          playing={playing}
          activeTool={activeTool}
          snapEnabled={snapEnabled}
          selectedClipIds={selectedClipIds}
          onChangeZoom={setZoom}
          onChangeTool={setActiveTool}
          onToggleSnap={() => setSnapEnabled((value) => !value)}
          onSelectClip={selectClip}
          onSeek={setPlayhead}
          onTogglePlay={() => setPlaying((value) => !value)}
          onAction={showToast}
          onCommand={runCommand}
          onImport={importMedia}
        />

        <StatusBar
          revision={project.revision}
          clipCount={allClips.length}
          assetCount={visibleAssets.length}
          duration={project.duration}
        />

        <AgentSurface
          open={agentOpen}
          tab={agentTab}
          thinking={thinking}
          modelLabel={settings.ai.model}
          onOpenChange={setAgentOpen}
          onTabChange={setAgentTab}
          onOpenSettings={() => setSettingsOpen(true)}
          chat={
            <>
              <AgentChat
                messages={messages}
                planShots={planShots}
                thinking={thinking}
                applied={applied}
                renderSettings={renderSettings}
                onApply={applyPlan}
                onRegenerate={regeneratePlan}
                onRetryRun={retryRun}
                onUndoRun={undoRun}
              />
              {approval && (
                <AgentApprovalBar
                  action={approval.action}
                  detail={approval.detail}
                  onApprove={() => resolveApproval(true)}
                  onReject={() => resolveApproval(false)}
                />
              )}
              {reviewReport && (
                <ReviewCard report={reviewReport} onDismiss={() => setReviewReport(null)} />
              )}
              <AgentComposer
                input={input}
                thinking={thinking}
                quickCutBusy={quickCutBusy}
                storyBusy={storyBusy}
                reviewBusy={reviewBusy}
                onChangeInput={setInput}
                onSend={sendMessage}
                onStop={stopAgentRun}
                onQuickCut={() => void runQuickCut({ vertical: renderSettings.height > renderSettings.width })}
                onStory={() => void runStoryPlan("cinematic")}
                onReview={() => void reviewTimeline()}
              />
            </>
          }
          replica={
            <ReplicaPanel
              ai={settings.ai}
              onToast={showToast}
              onApply={applyScriptToTimeline}
            />
          }
          scripts={
            <ScriptPanel
              onToast={showToast}
              onApply={applyScriptToTimeline}
              onOpenReplica={() => setAgentTab("replica")}
              initialScriptId={pendingScriptId}
              onConsumeInitial={() => setPendingScriptId(null)}
            />
          }
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        className="visually-hidden"
        aria-label="导入素材文件"
        data-agent-id="input.import-files"
        data-agent-role="file-input"
        data-agent-label="导入素材文件"
        onChange={(event) => {
          void importFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <input
        ref={projectInputRef}
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        aria-label="打开工程文件"
        data-agent-id="input.open-project"
        data-agent-role="file-input"
        data-agent-label="打开工程文件"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void file.text().then((contents) => loadProject(contents, null));
          }
          event.target.value = "";
        }}
      />

      <input
        ref={srtInputRef}
        type="file"
        accept=".srt,.vtt,text/plain"
        className="visually-hidden"
        aria-label="导入 SRT 字幕"
        data-agent-id="input.import-srt"
        data-agent-role="file-input"
        data-agent-label="导入 SRT 字幕"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void importSrt(file);
          }
          event.target.value = "";
        }}
      />

      {dragActive && (
        <div className="drop-overlay">
          <div className="drop-overlay__card">
            <Upload size={22} strokeWidth={1.6} />
            <strong>松开以导入素材</strong>
            <span>视频、音频、图片会加入左侧素材库</span>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <span className="toast__dot" />
          {toast}
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        commands={commands}
        onClose={() => setPaletteOpen(false)}
      />

      {assetDialog && (
        <div
          className="palette-backdrop settings-backdrop"
          onMouseDown={() => setAssetDialog(null)}
        >
          <div
            className="settings-panel asset-dialog"
            role="dialog"
            aria-label={assetDialog.mode === "rename" ? "重命名素材" : "删除素材"}
            data-agent-id="dialog.asset"
            data-agent-role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="settings-header">
              <div>
                <span className="panel-kicker">素材库</span>
                <h2>{assetDialog.mode === "rename" ? "重命名素材" : "删除素材"}</h2>
              </div>
              <button
                type="button"
                className="settings-close"
                aria-label="关闭"
                onClick={() => setAssetDialog(null)}
              >
                ×
              </button>
            </header>
            <div className="settings-body asset-dialog__body">
              {assetDialog.mode === "rename" ? (
                <input
                  className="settings-input"
                  autoFocus
                  value={assetNameDraft}
                  aria-label="素材名称"
                  data-agent-id="asset-dialog.name"
                  data-agent-role="textbox"
                  onChange={(event) => setAssetNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitAssetDialog();
                    }
                  }}
                />
              ) : (
                <p className="asset-dialog__warning">
                  删除「{assetDialog.asset.name}」后，时间线上引用它的片段也会被移除。
                </p>
              )}
            </div>
            <footer className="settings-footer">
              <button
                type="button"
                className="settings-button settings-button--ghost"
                onClick={() => setAssetDialog(null)}
              >
                取消
              </button>
              <button
                type="button"
                className={`settings-button settings-button--primary${assetDialog.mode === "delete" ? " is-danger" : ""}`}
                disabled={assetDialog.mode === "rename" && !assetNameDraft.trim()}
                data-agent-id="asset-dialog.confirm"
                data-agent-role="button"
                onClick={commitAssetDialog}
              >
                {assetDialog.mode === "rename" ? "保存" : "删除"}
              </button>
            </footer>
          </div>
        </div>
      )}

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        draftId={draftId ?? null}
        projectPath={projectPath}
        onClose={() => setSettingsOpen(false)}
        onSave={applySettings}
      />
    </div>
  );
}

function previewEdgeOverlay(
  clip: TrackClip,
  playhead: number,
): { color: string; opacity: number } | undefined {
  const local = playhead - clip.start;
  const remaining = clip.start + clip.duration - playhead;
  const overlays: Array<{ color: string; opacity: number }> = [];

  const pushIn = (color: string, elapsed: number, duration: number) => {
    if (duration <= 0.01 || elapsed < 0 || elapsed > duration) {
      return;
    }
    overlays.push({ color, opacity: Math.min(1, Math.max(0, 1 - elapsed / duration)) });
  };
  const pushOut = (color: string, elapsed: number, duration: number) => {
    if (duration <= 0.01 || elapsed < 0 || elapsed > duration) {
      return;
    }
    overlays.push({ color, opacity: Math.min(1, Math.max(0, elapsed / duration)) });
  };

  pushIn("black", local, clip.fadeIn ?? 0);
  pushIn(
    clip.transitionIn?.type === "flash" ? "white" : "black",
    local,
    clip.transitionIn?.duration ?? 0,
  );
  pushOut("black", (clip.fadeOut ?? 0) - remaining, clip.fadeOut ?? 0);
  pushOut(
    clip.transitionOut?.type === "flash" ? "white" : "black",
    (clip.transitionOut?.duration ?? 0) - remaining,
    clip.transitionOut?.duration ?? 0,
  );

  if (overlays.length === 0) {
    return undefined;
  }
  return overlays.reduce((best, item) => (item.opacity > best.opacity ? item : best));
}

function probeVideoDuration(source: File | string): Promise<number | null> {
  return new Promise((resolve) => {
    const url = typeof source === "string" ? source : URL.createObjectURL(source);
    const video = document.createElement("video");
    video.preload = "metadata";
    const cleanup = () => {
      if (typeof source !== "string") {
        URL.revokeObjectURL(url);
      }
    };
    video.onloadedmetadata = () => {
      resolve(Number.isFinite(video.duration) ? video.duration : null);
      cleanup();
    };
    video.onerror = () => {
      resolve(null);
      cleanup();
    };
    video.src = url;
  });
}

async function buildVideoThumbnail(path: string, url: string): Promise<string | undefined> {
  if (isTauriRuntime) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const thumbPath = await invoke<string>("generate_thumbnail", { path });
      return await localFileUrl(thumbPath);
    } catch {
      // 退回浏览器截图方案
    }
  }
  return captureVideoThumbnail(url);
}

function captureVideoThumbnail(src: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    let settled = false;
    const finish = (value: string | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };
    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(Math.max(0.1, video.duration * 0.1), 2);
      } catch {
        finish(undefined);
      }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const context = canvas.getContext("2d");
        if (!context || video.videoWidth === 0) {
          finish(undefined);
          return;
        }
        const sourceRatio = video.videoWidth / video.videoHeight;
        const targetRatio = canvas.width / canvas.height;
        const drawWidth = sourceRatio > targetRatio ? canvas.height * sourceRatio : canvas.width;
        const drawHeight = sourceRatio > targetRatio ? canvas.height : canvas.width / sourceRatio;
        context.drawImage(
          video,
          (canvas.width - drawWidth) / 2,
          (canvas.height - drawHeight) / 2,
          drawWidth,
          drawHeight,
        );
        finish(canvas.toDataURL("image/jpeg", 0.72));
      } catch {
        finish(undefined);
      }
    };
    video.onerror = () => finish(undefined);
    window.setTimeout(() => finish(undefined), 5000);
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function parseDuration(value: string): number | null {
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}
