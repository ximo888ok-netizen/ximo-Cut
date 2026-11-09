import { useState } from "react";
import type { TextStyle } from "../data";
import type { TextPreset } from "../core/presets";
import { presetCategories } from "../core/presets";
import { CategoryChips, useFilteredByCategory } from "./CategoryChips";

interface TextGridProps {
  presets: TextPreset[];
  onInsert: (sample: string, label: string, style: TextStyle) => void;
}

export function TextGrid({ presets, onInsert }: TextGridProps) {
  const [category, setCategory] = useState("全部");
  const visible = useFilteredByCategory(presets, category);

  return (
    <>
      <CategoryChips
        categories={presetCategories(presets)}
        value={category}
        onChange={setCategory}
        total={presets.length}
      />
      <div className="preset-grid preset-grid--text">
        {visible.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className="text-template"
            data-agent-id={`text-preset.${preset.id}`}
            data-agent-role="button"
            data-agent-label={preset.label}
            onClick={() => onInsert(preset.sample, preset.label, preset.style)}
          >
            <span
              className="text-template__sample"
              style={{
                color: preset.style.color,
                fontWeight: preset.style.bold ? 700 : 400,
                fontStyle: preset.style.align === "left" ? "normal" : undefined,
                background: preset.style.background
                  ? preset.style.backgroundColor
                  : undefined,
                padding: preset.style.background ? "0.08em 0.28em" : undefined,
                borderRadius: preset.style.background ? "0.16em" : undefined,
                textShadow: preset.style.stroke
                  ? `0 0 ${Math.max(1, preset.style.stroke)}px ${preset.style.strokeColor ?? "black"}`
                  : undefined,
              }}
            >
              {preset.sample}
            </span>
            <span className="text-template__name">{preset.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
