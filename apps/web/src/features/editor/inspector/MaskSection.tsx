import { Circle, Minus, Square, Trash2 } from "lucide-react";
import type { ClipMask, MaskShape } from "../data";
import { DEFAULT_MASK } from "../core/mask";
import { SliderRow } from "./SliderRow";

interface MaskSectionProps {
  mask?: ClipMask;
  onChange: (mask: ClipMask | undefined) => void;
}

const shapes: Array<{ id: MaskShape; label: string; icon: typeof Square }> = [
  { id: "rect", label: "矩形", icon: Square },
  { id: "ellipse", label: "椭圆", icon: Circle },
  { id: "linear", label: "线性", icon: Minus },
];

export function MaskSection({ mask, onChange }: MaskSectionProps) {
  if (!mask) {
    return (
      <section className="inspector-section">
        <span className="inspector-section__title">蒙版</span>
        <button
          type="button"
          className="mini-button"
          data-agent-id="button.mask-add"
          data-agent-role="button"
          data-agent-label="添加蒙版"
          onClick={() => onChange({ ...DEFAULT_MASK })}
        >
          添加蒙版
        </button>
      </section>
    );
  }

  const update = (patch: Partial<ClipMask>) => onChange({ ...mask, ...patch });

  return (
    <section className="inspector-section">
      <div className="keyframe-head">
        <span className="inspector-section__title">蒙版</span>
        <button
          type="button"
          className="mask-remove"
          aria-label="删除蒙版"
          data-agent-id="button.mask-remove"
          data-agent-role="button"
          data-agent-label="删除蒙版"
          onClick={() => onChange(undefined)}
        >
          <Trash2 size={10} strokeWidth={2} />
        </button>
      </div>

      <div className="mask-shapes">
        {shapes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              className={`mask-shape${mask.shape === item.id ? " is-active" : ""}`}
              data-agent-id={`mask.shape.${item.id}`}
              data-agent-role="button"
              data-agent-label={`${item.label}蒙版`}
              onClick={() => update({ shape: item.id })}
            >
              <Icon size={10} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </div>

      <SliderRow
        label="水平位置"
        value={Math.round(mask.x * 100)}
        min={0}
        max={100}
        step={1}
        display={`${Math.round(mask.x * 100)}%`}
        agentId="mask.x"
        disabled={false}
        onChange={(value) => update({ x: value / 100 })}
      />
      <SliderRow
        label="垂直位置"
        value={Math.round(mask.y * 100)}
        min={0}
        max={100}
        step={1}
        display={`${Math.round(mask.y * 100)}%`}
        agentId="mask.y"
        disabled={false}
        onChange={(value) => update({ y: value / 100 })}
      />
      <SliderRow
        label="宽度"
        value={Math.round(mask.width * 100)}
        min={5}
        max={100}
        step={1}
        display={`${Math.round(mask.width * 100)}%`}
        agentId="mask.width"
        disabled={false}
        onChange={(value) => update({ width: value / 100 })}
      />
      <SliderRow
        label="高度"
        value={Math.round(mask.height * 100)}
        min={5}
        max={100}
        step={1}
        display={`${Math.round(mask.height * 100)}%`}
        agentId="mask.height"
        disabled={false}
        onChange={(value) => update({ height: value / 100 })}
      />
      <SliderRow
        label="羽化"
        value={Math.round(mask.feather * 100)}
        min={0}
        max={50}
        step={1}
        display={`${Math.round(mask.feather * 100)}%`}
        agentId="mask.feather"
        disabled={false}
        onChange={(value) => update({ feather: value / 100 })}
      />
      <div className="toggle-row">
        <span>反转蒙版</span>
        <button
          type="button"
          className={`switch${mask.invert ? " is-on" : ""}`}
          aria-label="反转蒙版"
          aria-pressed={mask.invert}
          data-agent-id="mask.invert"
          data-agent-role="switch"
          data-agent-label="反转蒙版"
          onClick={() => update({ invert: !mask.invert })}
        >
          <i />
        </button>
      </div>
    </section>
  );
}
