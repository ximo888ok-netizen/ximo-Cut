import { useState } from "react";
import type { LookPreset } from "../core/presets";
import { presetCategories } from "../core/presets";
import { CategoryChips, useFilteredByCategory } from "./CategoryChips";

interface LookGridProps {
  presets: LookPreset[];
  selectedLook?: string;
  disabled: boolean;
  hint: string;
  agentPrefix: string;
  onApply: (id: string, label: string) => void;
}

export function LookGrid({
  presets,
  selectedLook,
  disabled,
  hint,
  agentPrefix,
  onApply,
}: LookGridProps) {
  const [category, setCategory] = useState("全部");
  const visible = useFilteredByCategory(presets, category);

  return (
    <>
      {disabled && <div className="panel-hint">{hint}</div>}
      <CategoryChips
        categories={presetCategories(presets)}
        value={category}
        onChange={setCategory}
        total={presets.length}
      />
      <div className="look-grid">
        {visible.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={`look-tile${selectedLook === preset.id ? " is-active" : ""}`}
            data-agent-id={`${agentPrefix}.${preset.id}`}
            data-agent-role="button"
            data-agent-label={preset.label}
            disabled={disabled}
            onClick={() => onApply(preset.id, preset.label)}
          >
            <span className="look-tile__thumb" style={{ filter: preset.css }} />
            <span className="look-tile__name">{preset.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
