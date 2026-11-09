import { useState } from "react";
import {
  Eye,
  EyeOff,
  Film,
  Lock,
  Magnet,
  MapPin,
  Music2,
  Plus,
  Scissors,
  Trash2,
  Type,
  Unlock,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Asset, Track, TrackClip } from "./data";
import { formatClock, formatTimecode, parseMediaDuration } from "./data";
import type { AudioAnalysisResult } from "./core/audioAnalysis";
import type {
  CommandResult,
  EditCommand,
  ExecuteOptions,
  ProjectState,
} from "./core/editorStore";

interface TimelineProps {
  project: ProjectState;
  assets: Asset[];
  audioAnalyses: AudioAnalysisResult[];
  playhead: number;
  zoom: number;
  playing: boolean;
  activeTool: ActiveTool;
  snapEnabled: boolean;
  selectedClipIds: string[];
  onChangeZoom: (zoom: number) => void;
  onChangeTool: (tool: ActiveTool) => void;
  onToggleSnap: () => void;
  onSelectClip: (clip: TrackClip | null, additive?: boolean) => void;
  onSeek: (seconds: number) => void;
  onTogglePlay: () => void;
  onAction: (message: string) => void;
  onCommand: (command: EditCommand, options?: ExecuteOptions) => CommandResult;
  onImport: () => void;
}

type ActiveTool = "select" | "blade" | "ripple";

export function Timeline({
  project,
  assets,
  audioAnalyses,
  playhead,
  zoom,
  playing,
  activeTool,
  snapEnabled,
  selectedClipIds,
  onChangeZoom,
  onChangeTool,
  onToggleSnap,
  onSelectClip,
  onSeek,
  onTogglePlay,
  onAction,
  onCommand,
  onImport,
}: TimelineProps) {
  const playheadPercent = (playhead / project.duration) * 100;
  const tickStep = timelineTickStep(project.duration, zoom);
  const ticks: number[] = [];
  for (let seconds = 0; seconds <= project.duration + 0.001; seconds += tickStep) {
    ticks.push(Number(seconds.toFixed(3)));
  }
  if (ticks[ticks.length - 1] < project.duration - 0.001) {
    ticks.push(project.duration);
  }
  const trackHeight = project.tracks.reduce((total, track) => total + track.height, 0);
  const timelineHeight = Math.min(340, Math.max(210, 33 + 23 + trackHeight + 24));
  const timelineEmpty = project.tracks.every((track) => track.clips.length === 0);
  const assetThumbnails = new Map(
    assets.filter((asset) => asset.thumbnail).map((asset) => [asset.id, asset.thumbnail!]),
  );
  const audioWaveforms = new Map(
    assets.flatMap((asset) => {
      const analysis = audioAnalyses.find((item) => item.file_name === asset.name);
      return analysis?.waveform.length ? [[asset.id, analysis.waveform] as const] : [];
    }),
  );

  const seekFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".timeline-clip")) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const seconds = ((event.clientX - rect.left) / rect.width) * project.duration;
    onSeek(Math.min(project.duration, Math.max(0, seconds)));
  };

  const run = (command: EditCommand, options?: ExecuteOptions) => {
    const result = onCommand(command, options);
    if (!result.ok && result.error) {
      onAction(result.error);
    }
    return result;
  };

  return (
    <section className="timeline" style={{ height: timelineHeight }} data-agent-id="panel.timeline" data-agent-role="panel" data-agent-label="时间线">
      <div className="timeline-toolbar">
        <div className="timeline-toolbar__left">
          <span className="timeline-title">时间线</span>
          <span className="timeline-sequence">主序列 · {formatClock(project.duration)}</span>
          <span className="tool-divider" />
          <button
            type="button"
            className={`timeline-tool${activeTool === "select" ? " is-active" : ""}`}
            title="选择工具"
            aria-label="选择工具"
            data-agent-id="button.timeline.select"
            data-agent-role="button"
            data-agent-label="选择工具"
            onClick={() => onChangeTool("select")}
          >
            <CursorIcon />
          </button>
          <button
            type="button"
            className={`timeline-tool${activeTool === "blade" ? " is-active" : ""}`}
            title="刀片工具"
            aria-label="刀片工具"
            data-agent-id="button.timeline.blade"
            data-agent-role="button"
            data-agent-label="刀片工具"
            onClick={() => onChangeTool("blade")}
          >
            <Scissors size={13} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className={`timeline-tool${activeTool === "ripple" ? " is-active" : ""}`}
            title="波纹删除"
            aria-label="波纹删除"
            data-agent-id="button.timeline.ripple"
            data-agent-role="button"
            data-agent-label="波纹删除"
            onClick={() => onChangeTool("ripple")}
          >
            <Trash2 size={13} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="timeline-tool"
            title="添加标记"
            aria-label="添加标记"
            data-agent-id="button.timeline.add-marker"
            data-agent-role="button"
            data-agent-label="添加标记"
            onClick={() => run({ type: "marker.add", time: playhead, label: "标记" })}
          >
            <MapPin size={13} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="timeline-tool"
            title="添加轨道"
            aria-label="添加轨道"
            data-agent-id="button.timeline.add-track"
            data-agent-role="button"
            data-agent-label="添加轨道"
            onClick={() => run({ type: "track.add", kind: "video" })}
          >
            <Plus size={14} strokeWidth={1.8} />
          </button>
        </div>

        <div className="timeline-toolbar__center">
          <span className={`timeline-live${playing ? " is-playing" : ""}`}>
            <span />
            {playing ? "播放中" : "已暂停"}
          </span>
          <span className="timeline-timecode">{formatTimecode(playhead, project.fps)}</span>
        </div>

        <div className="timeline-toolbar__right">
          <button type="button" className={`timeline-tool${snapEnabled ? " is-active" : ""}`} title="吸附" aria-label="吸附" data-agent-id="button.timeline.snap" data-agent-role="button" data-agent-label="吸附" onClick={onToggleSnap}>
            <Magnet size={13} strokeWidth={1.8} />
          </button>
          <span className="tool-divider" />
          <button
            type="button"
            className="timeline-tool"
            title="缩小"
            aria-label="缩小时间线"
            data-agent-id="button.timeline.zoom-out"
            data-agent-role="button"
            data-agent-label="缩小时间线"
            onClick={() => onChangeZoom(Math.max(1, Number((zoom - 0.25).toFixed(2))))}
          >
            <ZoomOut size={14} strokeWidth={1.8} />
          </button>
          <input
            type="range"
            className="timeline-zoom"
            min="1"
            max="10"
            step="0.25"
            value={zoom}
            aria-label="时间线缩放"
            data-agent-id="input.timeline-zoom"
            data-agent-role="slider"
            data-agent-label="时间线缩放"
            onChange={(event) => onChangeZoom(Number(event.target.value))}
          />
          <button
            type="button"
            className="timeline-tool"
            title="放大"
            aria-label="放大时间线"
            data-agent-id="button.timeline.zoom-in"
            data-agent-role="button"
            data-agent-label="放大时间线"
            onClick={() => onChangeZoom(Math.min(10, Number((zoom + 0.25).toFixed(2))))}
          >
            <ZoomIn size={14} strokeWidth={1.8} />
          </button>
          <button type="button" className="timeline-fit" onClick={() => onChangeZoom(1)} data-agent-id="button.timeline.fit" data-agent-role="button" data-agent-label="适应时间线">
            适应
          </button>
        </div>
      </div>

      <div className="timeline-grid">
        <div className="timeline-heads">
          <div className="timeline-heads__spacer" />
          {project.tracks.map((track) => (
            <TrackHead
              key={track.id}
              track={track}
              onToggleHidden={() => run({ type: "track.update", trackId: track.id, patch: { hidden: !track.hidden } })}
              onToggleLocked={() => run({ type: "track.update", trackId: track.id, patch: { locked: !track.locked } })}
              onToggleMuted={() => run({ type: "track.update", trackId: track.id, patch: { muted: !track.muted } })}
            />
          ))}
          <button
            type="button"
            className="timeline-add-track"
            data-agent-id="button.timeline.add-track-bottom"
            data-agent-role="button"
            data-agent-label="添加轨道"
            onClick={() => run({ type: "track.add", kind: "video" })}
          >
            <Plus size={12} strokeWidth={1.9} />
            添加轨道
          </button>
        </div>

        <div className="timeline-scroll">
          <div
            className="timeline-canvas"
            style={{ width: `${zoom * 100}%` }}
            data-agent-id="timeline.canvas"
            data-agent-role="timeline"
            data-agent-label="时间线画布"
            onPointerDown={seekFromPointer}
            onPointerMove={(event) => {
              if (event.buttons === 1) {
                seekFromPointer(event);
              }
            }}
          >
            <div className="timeline-ruler" onPointerDown={seekFromPointer}>
              {ticks.map((seconds) => (
                <span
                  className={`timeline-tick${seconds >= project.duration - 0.001 ? " is-end" : ""}`}
                  key={seconds}
                  style={{ left: `${(seconds / project.duration) * 100}%` }}
                >
                  <i />
                  <em>{formatClock(seconds)}</em>
                </span>
              ))}
            </div>

            {project.markers.map((marker) => (
              <span
                className="timeline-marker"
                key={marker.id}
                style={{ left: `${(marker.time / project.duration) * 100}%` }}
                title={`${marker.label} · ${formatTimecode(marker.time, project.fps)}`}
                data-agent-id={`timeline.marker.${marker.id}`}
                data-agent-role="marker"
                data-agent-label={marker.label}
              >
                <span className="timeline-marker__hit" />
                <i style={{ background: marker.color ?? "var(--accent)" }} />
                <button
                  type="button"
                  className="timeline-marker__delete"
                  title="删除标记"
                  aria-label={`删除标记 ${marker.label}`}
                  data-agent-id={`timeline.marker.delete.${marker.id}`}
                  data-agent-role="button"
                  data-agent-label={`删除标记 ${marker.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    run({ type: "marker.remove", markerId: marker.id });
                  }}
                >
                  ×
                </button>
              </span>
            ))}

            {project.tracks.map((track) => (
              <div
                className={`timeline-lane timeline-lane--${track.kind}${track.hidden ? " is-hidden" : ""}`}
                key={track.id}
                style={{ height: track.height }}
                data-agent-id={`timeline.lane.${track.id}`}
                data-agent-role="timeline-lane"
                data-agent-label={`${track.name} ${track.role}`}
                onClick={() => onSelectClip(null)}
              >
                {track.clips.map((clip) => (
                  <TimelineClip
                    key={clip.id}
                    clip={clip}
                    thumbnail={clip.assetId ? assetThumbnails.get(clip.assetId) : undefined}
                    waveform={clip.assetId ? audioWaveforms.get(clip.assetId) : undefined}
                    duration={project.duration}
                    selected={selectedClipIds.includes(clip.id)}
                    playing={playing}
                    tool={activeTool}
                    snap={snapEnabled}
                    locked={Boolean(track.locked)}
                    onSelect={(additive) => onSelectClip(clip, additive)}
                    onTogglePlay={onTogglePlay}
                    onMove={(start) => run({ type: "clip.move", clipId: clip.id, start })}
                    onTrim={(edge, delta) =>
                      run({
                        type: "clip.trim",
                        clipId: clip.id,
                        edge,
                        delta,
                        maxDuration: edge === "end" ? maxClipDuration(clip, assets) : undefined,
                      })
                    }
                    onSplit={(at) => run({ type: "clip.split", clipId: clip.id, at })}
                    onRippleDelete={() => run({ type: "clip.delete", clipId: clip.id, ripple: true })}
                  />
                ))}
              </div>
            ))}

            <div className="playhead" style={{ left: `${playheadPercent}%` }}>
              <span className="playhead__head" />
              <span className="playhead__line" />
            </div>
          </div>
        </div>
      </div>

      {timelineEmpty && (
        <div className="timeline-empty">
          <span className="timeline-empty__icon">
            <Film size={18} strokeWidth={1.6} />
          </span>
          <strong>时间线还是空的</strong>
          <span>导入素材后，双击素材卡片即可添加到这里</span>
          <button
            type="button"
            data-agent-id="button.timeline.empty-import"
            data-agent-role="button"
            data-agent-label="导入素材"
            onClick={onImport}
          >
            导入素材
          </button>
        </div>
      )}
    </section>
  );
}

function TrackHead({
  track,
  onToggleHidden,
  onToggleLocked,
  onToggleMuted,
}: {
  track: Track;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
  onToggleMuted: () => void;
}) {
  const Icon = track.kind === "audio" ? Music2 : track.kind === "text" ? Type : Film;
  return (
    <div className="track-head" style={{ height: track.height }} data-agent-id={`timeline.track.${track.id}`} data-agent-role="timeline-track" data-agent-label={`${track.name} ${track.role}`}>
      <span className={`track-head__stripe track-head__stripe--${track.kind}`} />
      <span className="track-head__icon">
        <Icon size={12} strokeWidth={1.8} />
      </span>
      <span className="track-head__name">
        <strong>{track.name}</strong>
        <em>{track.role}</em>
      </span>
      <span className="track-head__controls">
        <button
          type="button"
          aria-label={`${track.hidden ? "显示" : "隐藏"} ${track.name}`}
          title="显示/隐藏"
          data-agent-id={`button.track.${track.id}.visibility`}
          data-agent-role="button"
          data-agent-label={`${track.hidden ? "显示" : "隐藏"} ${track.name}`}
          onClick={onToggleHidden}
        >
          {track.hidden ? <EyeOff size={11} strokeWidth={1.8} /> : <Eye size={11} strokeWidth={1.8} />}
        </button>
        <button
          type="button"
          aria-label={`${track.locked ? "解锁" : "锁定"} ${track.name}`}
          title="锁定"
          data-agent-id={`button.track.${track.id}.lock`}
          data-agent-role="button"
          data-agent-label={`${track.locked ? "解锁" : "锁定"} ${track.name}`}
          onClick={onToggleLocked}
        >
          {track.locked ? <Lock size={10} strokeWidth={1.8} /> : <Unlock size={10} strokeWidth={1.8} />}
        </button>
        {track.kind === "audio" ? (
          <button
            type="button"
            aria-label={`${track.muted ? "取消静音" : "静音"} ${track.name}`}
            title="静音"
            data-agent-id={`button.track.${track.id}.mute`}
            data-agent-role="button"
            data-agent-label={`${track.muted ? "取消静音" : "静音"} ${track.name}`}
            onClick={onToggleMuted}
          >
            {track.muted ? <VolumeX size={11} strokeWidth={1.8} /> : <Volume2 size={11} strokeWidth={1.8} />}
          </button>
        ) : null}
      </span>
    </div>
  );
}

function timelineTickStep(duration: number, zoom: number): number {
  const target = duration / (12 * Math.max(1, zoom));
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  return steps.find((step) => step >= target) ?? 600;
}

function TimelineClip({
  clip,
  thumbnail,
  waveform,
  duration,
  selected,
  playing,
  tool,
  snap,
  locked,
  onSelect,
  onTogglePlay,
  onMove,
  onTrim,
  onSplit,
  onRippleDelete,
}: {
  clip: TrackClip;
  thumbnail?: string;
  waveform?: number[];
  duration: number;
  selected: boolean;
  playing: boolean;
  tool: ActiveTool;
  snap: boolean;
  locked: boolean;
  onSelect: (additive?: boolean) => void;
  onTogglePlay: () => void;
  onMove: (start: number) => void;
  onTrim: (edge: "start" | "end", delta: number) => void;
  onSplit: (at: number) => void;
  onRippleDelete: () => void;
}) {
  const [dragDelta, setDragDelta] = useState(0);
  const [trim, setTrim] = useState<{ edge: "start" | "end"; delta: number } | null>(null);

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (locked || tool !== "select") {
      return;
    }
    event.stopPropagation();
    const lane = event.currentTarget.closest(".timeline-lane");
    if (!lane) {
      return;
    }
    const laneWidth = lane.getBoundingClientRect().width;
    if (laneWidth <= 0) {
      return;
    }
    const startX = event.clientX;
    const secondsPerPixel = duration / laneWidth;
    let latest = 0;
    const onPointerMove = (moveEvent: PointerEvent) => {
      const raw = (moveEvent.clientX - startX) * secondsPerPixel;
      const proposed = clip.start + raw;
      const snappedStart = snap ? Math.round(proposed * 2) / 2 : proposed;
      latest = Math.max(
        -clip.start,
        Math.min(duration - clip.start - clip.duration, snappedStart - clip.start),
      );
      setDragDelta(latest);
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      setDragDelta(0);
      if (Math.abs(latest) > 0.02) {
        onMove(Number((clip.start + latest).toFixed(3)));
      }
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  };

  const startTrim = (edge: "start" | "end", event: React.PointerEvent<HTMLSpanElement>) => {
    if (locked) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    const lane = event.currentTarget.closest(".timeline-lane");
    if (!lane) {
      return;
    }
    const laneWidth = lane.getBoundingClientRect().width;
    if (laneWidth <= 0) {
      return;
    }
    const startX = event.clientX;
    const secondsPerPixel = duration / laneWidth;
    let latest = 0;
    const onPointerMove = (moveEvent: PointerEvent) => {
      const raw = (moveEvent.clientX - startX) * secondsPerPixel;
      const proposed = edge === "start"
        ? clip.start + raw
        : clip.start + clip.duration + raw;
      const snapped = snap ? Math.round(proposed * 2) / 2 : proposed;
      latest = edge === "start"
        ? Math.max(-clip.start, Math.min(clip.duration - 0.2, snapped - clip.start))
        : Math.max(-(clip.duration - 0.2), Math.min(duration - clip.start - clip.duration, snapped - (clip.start + clip.duration)));
      setTrim({ edge, delta: latest });
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      setTrim(null);
      if (Math.abs(latest) > 0.02) {
        onTrim(edge, Number(latest.toFixed(3)));
      }
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  };

  const trimStart = trim?.edge === "start" ? trim.delta : 0;
  const trimEnd = trim?.edge === "end" ? trim.delta : 0;
  const effectiveStart = clip.start + dragDelta + trimStart;
  const effectiveDuration = clip.duration - trimStart + trimEnd;
  const left = (effectiveStart / duration) * 100;
  const width = (effectiveDuration / duration) * 100;
  const handlePointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (tool === "blade") {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      onSplit(Number((clip.start + ratio * clip.duration).toFixed(3)));
      return;
    }
    if (tool === "ripple") {
      event.stopPropagation();
      onRippleDelete();
      return;
    }
    startDrag(event);
  };

  return (
    <button
      type="button"
      className={`timeline-clip timeline-clip--${clip.kind} timeline-clip--${clip.tone}${selected ? " is-selected" : ""}${clip.muted ? " is-muted" : ""}`}
      style={{
        left: `${left}%`,
        width: `${width}%`,
        ...(thumbnail
          ? {
              backgroundImage: `linear-gradient(rgba(24, 78, 170, 0.55), rgba(24, 78, 170, 0.55)), url(${thumbnail})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
      data-agent-id={`timeline.clip.${clip.id}`}
      data-agent-role="timeline-clip"
      data-agent-label={clip.name}
      data-agent-actions="click,drag,trim,split,delete"
      onClick={(event) => {
        event.stopPropagation();
        onSelect(event.ctrlKey || event.metaKey);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onTogglePlay();
      }}
      onPointerDown={handlePointer}
      title={`${clip.name} · ${clip.duration.toFixed(1)}s`}
    >
      {clip.kind === "audio" ? (
        <TimelineWave seed={clip.id.length + clip.duration} waveform={waveform} />
      ) : (
        <span className="timeline-clip__frames" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
      <span className="timeline-clip__top">
        <span className="timeline-clip__name">{clip.name}</span>
        <span className="timeline-clip__duration">{clip.duration.toFixed(1)}s</span>
      </span>
      {clip.kind === "text" && <span className="timeline-clip__text">T</span>}
      {clip.kind === "audio" && (
        <span className="timeline-clip__audio-tag">
          {clip.muted ? <VolumeX size={10} strokeWidth={2} /> : <Volume2 size={10} strokeWidth={2} />}
        </span>
      )}
      {clip.speed && clip.speed !== 1 && (
        <span className="timeline-clip__speed">{clip.speed.toFixed(2)}x</span>
      )}
      {(clip.filter || clip.adjust) && <span className="timeline-clip__fx">FX</span>}
      {clip.transitionIn && (
        <span className="timeline-clip__transition timeline-clip__transition--in" title={`${clip.transitionIn.type} ${clip.transitionIn.duration}s`} />
      )}
      {clip.transitionOut && (
        <span className="timeline-clip__transition timeline-clip__transition--out" title={`${clip.transitionOut.type} ${clip.transitionOut.duration}s`} />
      )}
      {clip.groupId && <span className="timeline-clip__group" title="已分组" />}
      {playing && selected && <span className="timeline-clip__pulse" />}
      <span
        className="timeline-clip__handle timeline-clip__handle--start"
        onPointerDown={(event) => startTrim("start", event)}
        role="presentation"
      />
      <span
        className="timeline-clip__handle timeline-clip__handle--end"
        onPointerDown={(event) => startTrim("end", event)}
        role="presentation"
      />
    </button>
  );
}

function maxClipDuration(clip: TrackClip, assets: Asset[]): number | undefined {
  const asset = clip.assetId ? assets.find((item) => item.id === clip.assetId) : undefined;
  if (!asset || asset.isImage) {
    return undefined;
  }
  const seconds = parseMediaDuration(asset.duration);
  if (!seconds || seconds <= 0) {
    return undefined;
  }
  const speed = clip.speed && clip.speed > 0 ? clip.speed : 1;
  return Math.max(0.2, (seconds - (clip.sourceIn ?? 0)) / speed);
}

function TimelineWave({ seed, waveform }: { seed: number; waveform?: number[] }) {
  const bars =
    waveform && waveform.length > 0
      ? Array.from({ length: 54 }, (_, index) => {
          const start = Math.floor((index * waveform.length) / 54);
          const end = Math.max(start + 1, Math.floor(((index + 1) * waveform.length) / 54));
          let peak = 0;
          for (let cursor = start; cursor < Math.min(waveform.length, end); cursor += 1) {
            peak = Math.max(peak, waveform[cursor] ?? 0);
          }
          return Math.round(8 + Math.min(1, peak) * 92);
        })
      : Array.from({ length: 54 }, (_, index) => {
          const wave =
            Math.sin((index + seed) * 0.74) * 22 + Math.cos((index + seed) * 0.27) * 16;
          return Math.round(34 + Math.abs(wave));
        });

  return (
    <span className="timeline-wave" aria-hidden="true">
      {bars.map((height, index) => (
        <i key={`${height}-${index}`} style={{ height: `${height}%` }} />
      ))}
    </span>
  );
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
      <path
        d="M3.2 2.6 12 7.4l-3.8 1.1-1.8 3.7-3.2-9.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
