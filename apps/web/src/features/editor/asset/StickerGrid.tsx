import { useState } from "react";
import type { StickerPreset } from "../core/presets";
import { presetCategories } from "../core/presets";
import { CategoryChips, useFilteredByCategory } from "./CategoryChips";

interface StickerGridProps {
  presets: StickerPreset[];
  onInsert: (glyph: string, label: string) => void;
}

export function StickerGrid({ presets, onInsert }: StickerGridProps) {
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
      <div className="sticker-grid">
        {visible.map((sticker) => (
          <button
            type="button"
            key={sticker.id}
            className="sticker-tile"
            data-agent-id={`sticker.${sticker.id}`}
            data-agent-role="button"
            data-agent-label={sticker.label}
            onClick={() => onInsert(sticker.glyph, sticker.label)}
          >
            <span>{sticker.glyph}</span>
            <em>{sticker.label}</em>
          </button>
        ))}
      </div>
    </>
  );
}
