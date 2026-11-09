interface CategoryChipsProps {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
  total: number;
}

export function CategoryChips({ categories, value, onChange, total }: CategoryChipsProps) {
  return (
    <div className="preset-cats" role="tablist" aria-label="分类筛选">
      <button
        type="button"
        role="tab"
        aria-selected={value === "全部"}
        className={value === "全部" ? "is-active" : ""}
        onClick={() => onChange("全部")}
      >
        全部
        <em>{total}</em>
      </button>
      {categories.map((category) => (
        <button
          type="button"
          role="tab"
          key={category}
          aria-selected={value === category}
          className={value === category ? "is-active" : ""}
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

export function useFilteredByCategory<T extends { category: string }>(
  presets: T[],
  category: string,
): T[] {
  return category === "全部"
    ? presets
    : presets.filter((preset) => preset.category === category);
}
