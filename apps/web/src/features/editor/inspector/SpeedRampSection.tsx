import { useState } from "react";
import { SPEED_RAMP_LABELS, type SpeedRampPreset } from "../core/speedRamp";

const presets: SpeedRampPreset[] = ["slow", "fast", "bullet"];

interface SpeedRampSectionProps {
  onApply: (preset: SpeedRampPreset) => void;
  onApplyCustom: (peakSpeed: number, fraction: number) => void;
}

export function SpeedRampSection({ onApply, onApplyCustom }: SpeedRampSectionProps) {
  const [peakSpeed, setPeakSpeed] = useState(0.5);
  const [fraction, setFraction] = useState(0.4);
  const previewSpeeds = [1, Math.sqrt(peakSpeed), peakSpeed, Math.sqrt(peakSpeed), 1];
  const previewPoints = previewSpeeds
    .map((speed, index) => `${index * 25},${32 - Math.min(1, speed / 4) * 26}`)
    .join(" ");
  return (
    <section className="inspector-section">
      <span className="inspector-section__title">速度斜坡</span>
      <div className="speed-ramp-grid">
        {presets.map((preset) => (
          <button
            type="button"
            key={preset}
            data-agent-id={`speed-ramp.${preset}`}
            data-agent-role="button"
            data-agent-label={SPEED_RAMP_LABELS[preset]}
            onClick={() => onApply(preset)}
          >
            {SPEED_RAMP_LABELS[preset]}
          </button>
        ))}
      </div>
      <p className="keyframe-hint">把片段拆成三段快慢快，并自动顺延后面的片段。</p>

      <div className="speed-ramp-custom">
        <span className="speed-ramp-custom__title">自定义曲线</span>
        <svg className="speed-ramp-curve" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={previewPoints} fill="none" stroke="currentColor" strokeWidth="1.4" />
          <line x1="0" y1="32" x2="100" y2="32" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
        </svg>
        <label className="speed-ramp-field">
          <span>峰值速度</span>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.05}
            value={peakSpeed}
            data-agent-id="speed-ramp.peak"
            data-agent-role="slider"
            data-agent-label="自定义峰值速度"
            onChange={(event) => setPeakSpeed(Number(event.target.value))}
          />
          <em>{peakSpeed.toFixed(2)}x</em>
        </label>
        <label className="speed-ramp-field">
          <span>变速占比</span>
          <input
            type="range"
            min={10}
            max={80}
            step={5}
            value={Math.round(fraction * 100)}
            data-agent-id="speed-ramp.fraction"
            data-agent-role="slider"
            data-agent-label="自定义变速占比"
            onChange={(event) => setFraction(Number(event.target.value) / 100)}
          />
          <em>{Math.round(fraction * 100)}%</em>
        </label>
        <button
          type="button"
          className="mini-button"
          data-agent-id="speed-ramp.custom"
          data-agent-role="button"
          data-agent-label="应用自定义速度曲线"
          onClick={() => onApplyCustom(peakSpeed, fraction)}
        >
          应用自定义速度
        </button>
      </div>
    </section>
  );
}
