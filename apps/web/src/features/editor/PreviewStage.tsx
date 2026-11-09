import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Captions,
  Eye,
  Maximize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { formatTimecode, type ClipMask, type TextStyle } from "./data";
import type { PresetOverlay } from "./core/presets";
import { maskToCss } from "./core/mask";
import { isTauriRuntime } from "./core/desktop";
import { PreviewAudioLayers, type PreviewAudioLayer } from "./PreviewAudioLayers";
import { PreviewBackground, type BackgroundLayer } from "./PreviewBackground";

export interface PreviewTextLayer {
  id: string;
  text: string;
  start: number;
  duration: number;
  style?: TextStyle;
  role: "caption" | "title" | "sticker";
}

interface PreviewStageProps {
  duration: number;
  playing: boolean;
  playhead: number;
  width: number;
  height: number;
  fps: number;
  format: "mp4" | "webm";
  previewUrl?: string;
  previewFilter?: string;
  previewOverlays?: PresetOverlay[];
  previewStart: number;
  previewSourceIn: number;
  previewSpeed: number;
  previewScale: number;
  previewRotation: number;
  previewPositionX: number;
  previewPositionY: number;
  previewMask?: ClipMask | null;
  previewOpacity: number;
  backgrounds?: BackgroundLayer[];
  blendMode?: string;
  previewMuted: boolean;
  previewVolume: number;
  previewIsImage: boolean;
  previewDucked: boolean;
  audioLayers: PreviewAudioLayer[];
  previewOverlay?: { color: string; opacity: number };
  textLayers: PreviewTextLayer[];
  hasClips: boolean;
  showCaptions: boolean;
  rendering: boolean;
  onTogglePlay: () => void;
  onToggleCaptions: () => void;
  onSeek: (seconds: number) => void;
  onAction: (message: string) => void;
}

export function PreviewStage({
  duration,
  playing,
  playhead,
  width,
  height,
  fps,
  format,
  previewUrl,
  previewFilter,
  previewOverlays,
  previewStart,
  previewSourceIn,
  previewSpeed,
  previewScale,
  previewRotation,
  previewPositionX,
  previewPositionY,
  previewMask,
  previewOpacity,
  backgrounds = [],
  blendMode,
  previewMuted,
  previewVolume,
  previewIsImage,
  previewDucked,
  audioLayers,
  previewOverlay,
  textLayers,
  hasClips,
  showCaptions,
  rendering,
  onTogglePlay,
  onToggleCaptions,
  onSeek,
  onAction,
}: PreviewStageProps) {
  const [safeArea, setSafeArea] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [volume, setVolume] = useState(0.72);
  const [bufferedRatio, setBufferedRatio] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progress = (playhead / duration) * 100;
  const vertical = height > width;
  const divisor = greatestCommonDivisor(width, height);
  const aspectLabel = `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
  const qualityLabel =
    height >= 2160 ? "4K" : height >= 1080 ? "1080p" : height >= 720 ? "720p" : `${height}p`;
  const frameLabel = String(Math.round(playhead * fps)).padStart(4, "0");
  const transformParts: string[] = [];
  // 与导出一致：位置按画布百分比位移，不随缩放比例被截断
  if (previewPositionX !== 0 || previewPositionY !== 0) {
    transformParts.push(`translate(${previewPositionX}%, ${previewPositionY}%)`);
  }
  if (previewScale !== 1) {
    transformParts.push(`scale(${previewScale})`);
  }
  if (previewRotation !== 0) {
    transformParts.push(`rotate(${previewRotation}deg)`);
  }
  const previewTransform =
    transformParts.length > 0 ? transformParts.join(" ") : undefined;
  const previewMaskStyle = previewMask ? maskToCss(previewMask) : undefined;
  const blendStyle: CSSProperties | undefined =
    backgrounds.length > 0 && blendMode && blendMode !== "normal"
      ? { mixBlendMode: blendMode as CSSProperties["mixBlendMode"] }
      : undefined;
  const visibleTextLayers = textLayers.filter(
    (layer) => showCaptions || layer.role !== "caption",
  );

  useEffect(() => {
    setPreviewFailed(false);
  }, [previewUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.volume = previewMuted ? 0 : Math.min(1, Math.max(0, volume * previewVolume));
    video.muted = previewMuted || volume === 0 || previewVolume === 0;
  }, [volume, previewUrl, previewMuted, previewVolume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.playbackRate = Math.min(4, Math.max(0.25, previewSpeed));
  }, [previewSpeed, previewUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (playing) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [playing, previewUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) {
      return;
    }
    const target =
      previewSourceIn + Math.max(0, playhead - previewStart) * previewSpeed;
    const clamped = Math.min(target, video.duration - 0.01);
    if (Math.abs(video.currentTime - clamped) > 0.18) {
      video.currentTime = Math.max(0, clamped);
    }
  }, [playhead, previewUrl, previewSourceIn, previewStart, previewSpeed]);

  // 缓冲条读取真实缓冲进度，再按当前片段映射回时间线位置
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      setBufferedRatio(0);
      return;
    }
    const syncBuffered = () => {
      if (video.buffered.length === 0 || duration <= 0) {
        setBufferedRatio(0);
        return;
      }
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const timelineEnd =
        previewStart + (bufferedEnd - previewSourceIn) / Math.max(0.01, previewSpeed);
      setBufferedRatio(Math.min(1, Math.max(0, timelineEnd / duration)));
    };
    video.addEventListener("progress", syncBuffered);
    video.addEventListener("loadedmetadata", syncBuffered);
    video.addEventListener("timeupdate", syncBuffered);
    syncBuffered();
    return () => {
      video.removeEventListener("progress", syncBuffered);
      video.removeEventListener("loadedmetadata", syncBuffered);
      video.removeEventListener("timeupdate", syncBuffered);
    };
  }, [previewUrl, previewStart, previewSourceIn, previewSpeed, duration]);

  const seekBy = (delta: number) => {
    onSeek(Math.min(duration, Math.max(0, playhead + delta)));
  };

  return (
    <section className="stage-column" data-agent-id="panel.preview" data-agent-role="panel" data-agent-label="节目监视器">
      <div className="stage-topbar">
        <div className="stage-topbar__left">
          <span className="live-dot" />
          <span>播放器</span>
          <span className="stage-topbar__badge">{aspectLabel}</span>
        </div>
        <div className="stage-topbar__right">
          <button
            type="button"
            className={`stage-tool${safeArea ? " is-active" : ""}`}
            data-agent-id="button.safe-area"
            data-agent-role="button"
            data-agent-label="显示安全框"
            onClick={() => setSafeArea((value) => !value)}
            title="显示安全框"
          >
            <Eye size={13} strokeWidth={1.8} />
            安全框
          </button>
          <button
            type="button"
            className={`stage-tool${showCaptions ? " is-active" : ""}`}
            data-agent-id="button.captions-preview"
            data-agent-role="button"
            data-agent-label="字幕预览"
            onClick={onToggleCaptions}
            title="字幕预览"
          >
            <Captions size={13} strokeWidth={1.8} />
            字幕
          </button>
        </div>
      </div>

      <div className={`preview-stage${playing ? " is-playing" : ""}`} data-agent-id="preview.stage" data-agent-role="preview" data-agent-label="视频预览" data-agent-actions="click">
        <div className="preview-stage__ambient" />
        {rendering && (
          <div className="render-indicator" role="status">
            <span className="render-indicator__spinner" />
            正在导出视频，请稍候…
          </div>
        )}
        <div className="preview-frame" style={vertical ? { width: "auto", height: "100%", aspectRatio: `${width} / ${height}` } : { aspectRatio: `${width} / ${height}` }}>
          {backgrounds.map((layer) => (
            <PreviewBackground
              key={layer.id}
              layer={layer}
              playing={playing}
              playhead={playhead}
              masterVolume={volume}
            />
          ))}
          {previewUrl && !previewFailed && (previewIsImage ? (
            <img
              className={`preview-video${vertical ? " preview-video--cover" : ""}`}
              src={previewUrl}
              alt="当前时间线图片"
              style={{
                filter: previewFilter,
                opacity: previewOpacity,
                transform: previewTransform,
                ...previewMaskStyle,
                ...blendStyle,
              }}
              data-agent-id="preview.image"
              data-agent-role="image"
              data-agent-label="当前时间线图片"
            />
          ) : (
            <video
              ref={videoRef}
              className={`preview-video${vertical ? " preview-video--cover" : ""}`}
              src={previewUrl}
              playsInline
              style={{
                filter: previewFilter,
                opacity: previewOpacity,
                transform: previewTransform,
                ...previewMaskStyle,
                ...blendStyle,
              }}
              data-agent-id="preview.video"
              data-agent-role="video"
              data-agent-label="当前时间线视频"
              onError={() => setPreviewFailed(true)}
            />
          ))}
          <PreviewAudioLayers
            layers={audioLayers}
            playing={playing}
            playhead={playhead}
            masterVolume={volume}
            ducked={previewDucked}
          />
          {previewOverlay && (
            <span
              className="preview-fade"
              style={{
                background: previewOverlay.color,
                opacity: previewOverlay.opacity,
              }}
            />
          )}
          {previewOverlays?.map((kind) => (
            <span key={kind} className={`preview-look preview-look--${kind}`} aria-hidden="true" />
          ))}
          <div className="preview-scene">
            <div className="preview-scene__sky" />
            <div className="preview-scene__sun" />
            <div className="preview-scene__haze" />
            <div className="preview-scene__sea">
              <span className="preview-scene__shimmer preview-scene__shimmer--one" />
              <span className="preview-scene__shimmer preview-scene__shimmer--two" />
              <span className="preview-scene__shimmer preview-scene__shimmer--three" />
            </div>
            <div className="preview-scene__cliff preview-scene__cliff--left" />
            <div className="preview-scene__cliff preview-scene__cliff--right" />
            <div className="preview-scene__figure">
              <span className="preview-scene__head" />
              <span className="preview-scene__body" />
            </div>
            <div className="preview-scene__birds" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-scene__grain" />

            <div className="preview-overlay preview-overlay--top">
              <span className="monitor-chip">
                <span />
                REC. 709
              </span>
              <span className="monitor-chip monitor-chip--muted">FRAME {frameLabel}</span>
            </div>

            {safeArea && (
              <div className="safe-area" aria-hidden="true">
                <div className="safe-area__outer" />
                <div className="safe-area__inner" />
                <div className="safe-area__thirds safe-area__thirds--v1" />
                <div className="safe-area__thirds safe-area__thirds--v2" />
                <div className="safe-area__thirds safe-area__thirds--h1" />
                <div className="safe-area__thirds safe-area__thirds--h2" />
              </div>
            )}

            {visibleTextLayers.map((layer) => {
              const style = layer.style;
              const animation = style?.animation ?? "none";
              const localTime = Math.max(0, playhead - layer.start);
              const enter = Math.min(1, localTime / 0.35);
              const leave = Math.min(1, Math.max(0, (layer.duration - localTime) / 0.35));
              const slideOffset = animation === "slide" ? (1 - enter) * 16 : 0;
              const align = style?.align ?? "center";
              const position = style?.position ?? "bottom";
              const transforms: string[] = [];
              if (align === "center") transforms.push("translateX(-50%)");
              if (position === "center") transforms.push("translateY(-50%)");
              if (slideOffset !== 0) transforms.push(`translateY(${slideOffset}px)`);
              return (
                <div
                  key={layer.id}
                  className={`preview-caption preview-caption--${position}`}
                  style={{
                    left: align === "right" ? "auto" : align === "left" ? "6%" : "50%",
                    right: align === "right" ? "6%" : "auto",
                    color: style?.color ?? "#ffffff",
                    fontFamily: previewFontFamily(layer.text),
                    fontSize: `calc(${(5 * (style?.size ?? 1)).toFixed(2)}cqh)`,
                    fontWeight: style?.bold ? 700 : 400,
                    lineHeight: 1.25,
                    WebkitTextStrokeWidth: style?.stroke
                      ? `${strokeEm(style.stroke, style.size, height).toFixed(3)}em`
                      : undefined,
                    WebkitTextStrokeColor: style?.stroke
                      ? (style.strokeColor ?? "#000000")
                      : undefined,
                    background: style?.background
                      ? (style.backgroundColor ?? "#000000") + "b8"
                      : undefined,
                    padding: style?.background ? "0.12em 0.42em" : 0,
                    borderRadius: style?.background ? "0.18em" : undefined,
                    maxWidth: "82%",
                    textAlign: align,
                    opacity: animation === "none" ? 1 : Math.min(enter, leave),
                    transform: transforms.length > 0 ? transforms.join(" ") : "none",
                  }}
                  data-agent-id="preview.caption"
                  data-agent-role="caption"
                  data-agent-label={`预览文字-${layer.id}`}
                >
                  {layer.text}
                </div>
              );
            })}

            {previewFailed && (
              <div className="preview-empty-hint preview-empty-hint--error">
                当前素材无法预览 · 文件可能已被移动或格式不受支持
              </div>
            )}

            {!previewUrl && visibleTextLayers.length === 0 && (
              <div className="preview-empty-hint">
                {hasClips
                  ? "当前位置没有画面 · 在时间线移动播放头"
                  : "时间线暂无可预览画面 · 导入素材并拖到时间线"}
              </div>
            )}

            <div className="preview-overlay preview-overlay--bottom">
              <span className="timecode-badge">{formatTimecode(playhead)}</span>
              <span className="proxy-badge">{qualityLabel} · 预览</span>
            </div>
          </div>
        </div>
      </div>

      <div className="transport">
        <div className="transport__timeline">
          <span className="transport__elapsed">{formatTimecode(playhead)}</span>
          <div
            className="transport__scrub"
            data-agent-id="preview.scrub"
            data-agent-role="slider"
            data-agent-label="播放进度"
            data-agent-actions="click"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              onSeek(((event.clientX - rect.left) / rect.width) * duration);
            }}
            role="presentation"
          >
            <span
              className="transport__scrub-buffer"
              style={{ width: `${Math.max(progress, bufferedRatio * 100)}%` }}
            />
            <span className="transport__scrub-fill" style={{ width: `${progress}%` }} />
            <span className="transport__scrub-head" style={{ left: `${progress}%` }} />
          </div>
          <span className="transport__duration">{formatTimecode(duration)}</span>
        </div>

        <div className="transport__controls">
          <div className="transport__side">
            <button type="button" className="icon-button" aria-label="后退 5 秒" title="后退 5 秒" data-agent-id="button.skip-back" data-agent-role="button" data-agent-label="后退 5 秒" onClick={() => seekBy(-5)}>
              <SkipBack size={15} strokeWidth={1.8} />
            </button>
            <button type="button" className="play-button" aria-label={playing ? "暂停" : "播放"} data-agent-id="button.play" data-agent-role="button" data-agent-label={playing ? "暂停" : "播放"} onClick={onTogglePlay}>
              {playing ? <Pause size={16} fill="currentColor" strokeWidth={1.8} /> : <Play size={16} fill="currentColor" strokeWidth={1.8} />}
            </button>
            <button type="button" className="icon-button" aria-label="前进 5 秒" title="前进 5 秒" data-agent-id="button.skip-forward" data-agent-role="button" data-agent-label="前进 5 秒" onClick={() => seekBy(5)}>
              <SkipForward size={15} strokeWidth={1.8} />
            </button>
          </div>

          <div className="transport__meta">
            <span>{width} × {height}</span>
            <span>{fps} fps</span>
            <span>{format === "webm" ? "VP9 · Opus" : "H.264 · AAC"}</span>
          </div>

          <div className="transport__side transport__side--right">
            <Volume2 size={14} strokeWidth={1.8} />
            <input
              type="range"
              className="preview-volume"
              min="0"
              max="100"
              value={Math.round(volume * 100)}
              aria-label="预览音量"
              data-agent-id="input.preview-volume"
              data-agent-role="slider"
              data-agent-label="预览音量"
              onChange={(event) => setVolume(Number(event.target.value) / 100)}
            />
            <span className="quality-pill">{qualityLabel}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="全屏预览"
              title="全屏预览"
              data-agent-id="button.fullscreen"
              data-agent-role="button"
              data-agent-label="全屏预览"
              onClick={() => {
                if (!isTauriRuntime) {
                  onAction("浏览器预览不支持全屏窗口");
                  return;
                }
                void import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
                  const appWindow = getCurrentWindow();
                  await appWindow.setFullscreen(!(await appWindow.isFullscreen()));
                });
              }}
            >
              <Maximize2 size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? Math.max(1, a) : greatestCommonDivisor(b, a % b);
}

// 与导出端的字体选择保持一致：中文用雅黑，emoji / 符号用系统专用字体
function previewFontFamily(text: string): string {
  const hasCjk = Array.from(text).some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return (code >= 0x3000 && code <= 0x9fff) || (code >= 0xff00 && code <= 0xffef);
  });
  const hasEmoji = Array.from(text).some((character) => (character.codePointAt(0) ?? 0) >= 0x1f000);
  const hasSymbol = Array.from(text).some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code >= 0x2190 && code <= 0x2bff;
  });
  if (!hasCjk && hasEmoji) {
    return '"Segoe UI Emoji", "Microsoft YaHei", "微软雅黑", sans-serif';
  }
  if (!hasCjk && hasSymbol) {
    return '"Segoe UI Symbol", "Microsoft YaHei", "微软雅黑", sans-serif';
  }
  return '"Microsoft YaHei", "微软雅黑", sans-serif';
}

// 导出端描边宽度是像素值，这里换算成相对字号的 em，保证预览与导出比例一致
function strokeEm(stroke: number, size: number | undefined, frameHeight: number): number {
  return Math.min(0.32, Math.max(0.01, stroke / Math.max(1, frameHeight * 0.05 * (size ?? 1))));
}
