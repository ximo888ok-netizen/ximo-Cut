import { Diamond, Trash2 } from "lucide-react";
import { useState } from "react";
import type { BlendMode, ClipMask, Keyframe, TrackClip } from "../data";
import { evaluateProperty } from "../core/keyframes";
import { MaskSection } from "./MaskSection";
import { SpeedRampSection } from "./SpeedRampSection";
import type { SpeedRampPreset } from "../core/speedRamp";

interface KeyframeSectionProps {
  clip: TrackClip;
  playhead: number;
  onAdd: (keyframe: Keyframe) => void;
  onRemove: (keyframeId: string) => void;
  onUpdateMask: (mask: ClipMask | undefined) => void;
  onSpeedRamp: (preset: SpeedRampPreset) => void;
  onCustomSpeedRamp: (peakSpeed: number, fraction: number) => void;
  onUpdateBlend: (mode: BlendMode) => void;
}

const CURVE_COLORS: Record<Keyframe["property"], string> = {
  scale: "#4ea1ff",
  rotation: "#f3a43b",
  opacity: "#69d8b4",
  positionX: "#ff7ab6",
  positionY: "#b78cff",
  volumeDb: "#ffd166",
};

const properties: Array<{
  id: Keyframe["property"];
  label: string;
  fallback: (clip: TrackClip) => number;
  format: (value: number) => string;
}> = [
  { id: "scale", label: "缩放", fallback: (clip) => clip.scale ?? 1, format: (value) => `${Math.round(value * 100)}%` },
  { id: "rotation", label: "旋转", fallback: (clip) => clip.rotation ?? 0, format: (value) => `${value.toFixed(0)}°` },
  { id: "opacity", label: "不透明度", fallback: (clip) => clip.opacity ?? 1, format: (value) => `${Math.round(value * 100)}%` },
  { id: "positionX", label: "水平位置", fallback: (clip) => clip.positionX ?? 0, format: (value) => `${value.toFixed(0)}%` },
  { id: "positionY", label: "垂直位置", fallback: (clip) => clip.positionY ?? 0, format: (value) => `${value.toFixed(0)}%` },
];

export function KeyframeSection({
  clip,
  playhead,
  onAdd,
  onRemove,
  onUpdateMask,
  onSpeedRamp,
  onCustomSpeedRamp,
  onUpdateBlend,
}: KeyframeSectionProps) {
  const [easing, setEasing] = useState<NonNullable<Keyframe["easing"]>>("easeInOut");
  const localTime = Math.min(clip.duration, Math.max(0, playhead - clip.start));
  const frames = [...(clip.keyframes ?? [])].sort((a, b) => a.time - b.time);
  const curves = properties
    .filter((item) => frames.some((frame) => frame.property === item.id))
    .map((item) => {
      const samples = Array.from({ length: 41 }, (_, index) =>
        evaluateProperty(
          clip,
          item.id,
          (index / 40) * clip.duration,
          item.fallback(clip),
        ),
      );
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      const range = max - min || 1;
      const y = (value: number) => 37 - ((value - min) / range) * 34;
      return {
        item,
        color: CURVE_COLORS[item.id],
        points: samples.map((value, index) => `${index * 2.5},${y(value)}`).join(" "),
        dots: frames
          .filter((frame) => frame.property === item.id)
          .map((frame) => ({
            x: clip.duration > 0 ? (frame.time / clip.duration) * 100 : 0,
            y: y(frame.value),
          })),
      };
    });

  const add = (property: Keyframe["property"], fallback: number) => {
    onAdd({
      id: `kf-${Date.now().toString(36)}-${property}`,
      property,
      time: Number(localTime.toFixed(3)),
      value: Number(
        evaluateProperty(clip, property, localTime, fallback).toFixed(3),
      ),
      easing,
    });
  };

  return (
    <section className="inspector-section">
      <div className="keyframe-head">
        <span className="inspector-section__title">关键帧</span>
        <select
          className="inspector-select keyframe-easing"
          value={easing}
          aria-label="关键帧缓动"
          data-agent-id="keyframe.easing"
          data-agent-role="select"
          data-agent-label="关键帧缓动"
          onChange={(event) => setEasing(event.target.value as NonNullable<Keyframe["easing"]>)}
        >
          <option value="linear">线性</option>
          <option value="easeIn">缓入</option>
          <option value="easeOut">缓出</option>
          <option value="easeInOut">缓入缓出</option>
          <option value="hold">保持</option>
        </select>
      </div>

      <div className="keyframe-properties">
        {properties.map((item) => {
          const value = evaluateProperty(clip, item.id, localTime, item.fallback(clip));
          return (
            <button
              type="button"
              key={item.id}
              className="keyframe-add"
              data-agent-id={`keyframe.add.${item.id}`}
              data-agent-role="button"
              data-agent-label={`添加${item.label}关键帧`}
              title={`在 ${localTime.toFixed(2)}s 添加${item.label}关键帧`}
              onClick={() => add(item.id, item.fallback(clip))}
            >
              <Diamond size={9} strokeWidth={2} />
              <span>{item.label}</span>
              <i>{item.format(value)}</i>
            </button>
          );
        })}
      </div>

      {curves.length > 0 && (
        <div className="keyframe-curve" data-agent-id="keyframe.curve" data-agent-role="chart">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
            {curves.map((curve) => (
              <g key={curve.item.id}>
                <polyline
                  points={curve.points}
                  fill="none"
                  stroke={curve.color}
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                />
                {curve.dots.map((dot, index) => (
                  <circle
                    key={`${curve.item.id}-${index}`}
                    cx={dot.x}
                    cy={dot.y}
                    r="1.4"
                    fill={curve.color}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            ))}
          </svg>
          <div className="keyframe-curve__legend">
            {curves.map((curve) => (
              <span key={curve.item.id} style={{ color: curve.color }}>
                <i style={{ background: curve.color }} />
                {curve.item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {frames.length === 0 ? (
        <p className="keyframe-empty">把播放头移到片段内，点上面的属性即可打第一个关键帧。</p>
      ) : (
        <>
          <p className="keyframe-hint">
            该属性已有关键帧：继续拖动上方滑杆会在播放头自动补一帧。
          </p>
          <ul className="keyframe-list">
            {frames.map((frame) => {
              const meta = properties.find((item) => item.id === frame.property);
              return (
                <li key={frame.id}>
                  <span>{meta?.label ?? frame.property}</span>
                  <i>{frame.time.toFixed(2)}s</i>
                  <strong>{meta?.format(frame.value) ?? frame.value}</strong>
                  <button
                    type="button"
                    aria-label="删除关键帧"
                    data-agent-id={`keyframe.remove.${frame.id}`}
                    data-agent-role="button"
                    data-agent-label="删除关键帧"
                    onClick={() => onRemove(frame.id)}
                  >
                    <Trash2 size={10} strokeWidth={2} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <MaskSection mask={clip.mask} onChange={onUpdateMask} />
      <section className="inspector-section">
        <span className="inspector-section__title">混合模式</span>
        <select
          className="inspector-select"
          value={clip.blendMode ?? "normal"}
          aria-label="混合模式"
          data-agent-id="blend.mode"
          data-agent-role="select"
          data-agent-label="混合模式"
          onChange={(event) => onUpdateBlend(event.target.value as BlendMode)}
        >
          <option value="normal">正常</option>
          <option value="multiply">正片叠底</option>
          <option value="screen">滤色</option>
          <option value="overlay">叠加</option>
          <option value="soft-light">柔光</option>
          <option value="darken">变暗</option>
          <option value="lighten">变亮</option>
        </select>
        <p className="keyframe-hint">需要下方有另一条视频轨，混合效果才可见。</p>
      </section>
      <SpeedRampSection onApply={onSpeedRamp} onApplyCustom={onCustomSpeedRamp} />
    </section>
  );
}
