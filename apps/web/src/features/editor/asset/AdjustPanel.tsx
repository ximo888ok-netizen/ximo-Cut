import { Clapperboard, RotateCcw } from "lucide-react";
import {
  DEFAULT_ADJUST,
  type ClipAdjust,
  type TrackClip,
} from "../data";

interface AdjustPanelProps {
  selectedClip: TrackClip | null;
  onAdjust: (patch: Partial<ClipAdjust>) => void;
}

type AdjustKey = keyof typeof DEFAULT_ADJUST;

const FIELDS: Array<{ key: AdjustKey; label: string; min: number; max: number }> = [
  { key: "brightness", label: "亮度", min: -100, max: 100 },
  { key: "contrast", label: "对比度", min: -100, max: 100 },
  { key: "saturation", label: "饱和度", min: -100, max: 100 },
  { key: "exposure", label: "曝光", min: -100, max: 100 },
  { key: "temperature", label: "色温", min: -100, max: 100 },
  { key: "tint", label: "色调", min: -100, max: 100 },
  { key: "hue", label: "色相", min: -180, max: 180 },
  { key: "highlights", label: "高光", min: -100, max: 100 },
  { key: "shadows", label: "阴影", min: -100, max: 100 },
  { key: "vibrance", label: "自然饱和", min: -100, max: 100 },
  { key: "sharpen", label: "锐化", min: 0, max: 100 },
  { key: "grain", label: "颗粒", min: 0, max: 100 },
  { key: "vignette", label: "暗角", min: 0, max: 100 },
  { key: "fade", label: "褪色", min: 0, max: 100 },
];

export function AdjustPanel({ selectedClip, onAdjust }: AdjustPanelProps) {
  const adjust = { ...DEFAULT_ADJUST, ...(selectedClip?.adjust ?? {}) };
  const disabled = !selectedClip;

  return (
    <div className={`adjust-panel${disabled ? " is-disabled" : ""}`}>
      <div className="adjust-panel__target">
        <Clapperboard size={13} strokeWidth={1.8} />
        <span>{selectedClip?.name ?? "先在时间线选择一个片段"}</span>
      </div>
      {FIELDS.map((field) => (
        <AdjustSlider
          key={field.key}
          label={field.label}
          value={adjust[field.key]}
          min={field.min}
          max={field.max}
          agentId={`adjust.${field.key}`}
          disabled={disabled}
          onChange={(value) => onAdjust({ [field.key]: value })}
        />
      ))}
      <button
        type="button"
        className="mini-button adjust-reset"
        data-agent-id="button.adjust-reset"
        data-agent-role="button"
        data-agent-label="重置调节"
        disabled={disabled}
        onClick={() => onAdjust({ ...DEFAULT_ADJUST })}
      >
        <RotateCcw size={11} strokeWidth={1.8} />
        重置调节
      </button>
    </div>
  );
}

function AdjustSlider({
  label,
  value,
  min,
  max,
  agentId,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  agentId: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="adjust-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        disabled={disabled}
        data-agent-id={agentId}
        data-agent-role="slider"
        data-agent-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <em>{value > 0 ? `+${value}` : value}</em>
    </label>
  );
}
