import { ArrowLeftRight } from "lucide-react";
import type { TransitionPreset } from "../core/presets";
import type { TransitionSpec } from "../data";

interface TransitionGridProps {
  presets: TransitionPreset[];
  disabled: boolean;
  onApply: (transition: TransitionSpec, label: string) => void;
}

export function TransitionGrid({ presets, disabled, onApply }: TransitionGridProps) {
  return (
    <>
      {disabled && (
        <div className="panel-hint">先在时间线选择一个片段，再添加转场</div>
      )}
      <div className="preset-grid">
        {presets.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={`transition-tile${preset.id === "tr-none" ? " is-none" : ""}`}
            data-agent-id={`transition.${preset.id}`}
            data-agent-role="button"
            data-agent-label={preset.label}
            disabled={disabled}
            onClick={() => onApply({ type: preset.type, duration: preset.duration }, preset.label)}
          >
            <span
              className={`transition-tile__thumb${preset.type === "flash" ? " is-flash" : ""}`}
            >
              <ArrowLeftRight size={16} strokeWidth={1.6} />
            </span>
            <span className="transition-tile__name">{preset.label}</span>
            <em>{preset.note}</em>
          </button>
        ))}
      </div>
      <p className="preset-note">
        转场在当前版本以真实可渲染的淡化家族实现；滑动、圆形等复杂转场需要多轨合成，暂不提供。
      </p>
    </>
  );
}
