import {
  DEFAULT_TEXT_STYLE,
  type TextAnimation,
  type TextPosition,
  type TextStyle,
} from "./data";

const SIZES = [
  { id: "small", label: "小", value: 0.75 },
  { id: "normal", label: "标准", value: 1 },
  { id: "large", label: "大", value: 1.4 },
  { id: "huge", label: "特大", value: 1.9 },
];

const COLORS = [
  { id: "white", label: "白色", value: "#ffffff" },
  { id: "yellow", label: "黄色", value: "#ffd84d" },
  { id: "red", label: "红色", value: "#ff5a5a" },
  { id: "green", label: "绿色", value: "#59e08a" },
  { id: "cyan", label: "青色", value: "#5ad8ff" },
];

const POSITIONS: Array<{ id: TextPosition; label: string }> = [
  { id: "top", label: "顶部" },
  { id: "center", label: "居中" },
  { id: "bottom", label: "底部" },
];

const ANIMATIONS: Array<{ id: TextAnimation; label: string }> = [
  { id: "none", label: "无" },
  { id: "fade", label: "淡入" },
  { id: "slide", label: "上滑" },
];

interface TextStyleControlsProps {
  value?: TextStyle;
  onChange: (patch: Partial<TextStyle>) => void;
}

export function TextStyleControls({ value, onChange }: TextStyleControlsProps) {
  const style: TextStyle = { ...DEFAULT_TEXT_STYLE, ...value };

  return (
    <div className="text-style">
      <div className="text-style__row">
        <span className="text-style__label">字号</span>
        <div className="text-style__options">
          {SIZES.map((size) => (
            <button
              key={size.id}
              type="button"
              className={`mini-button${Math.abs(style.size - size.value) < 0.01 ? " is-active" : ""}`}
              data-agent-id={`inspector.text-size.${size.id}`}
              data-agent-role="button"
              data-agent-label={`字号${size.label}`}
              onClick={() => onChange({ size: size.value })}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>
      <div className="text-style__row">
        <span className="text-style__label">颜色</span>
        <div className="text-style__options">
          {COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className={`text-color-dot${style.color === color.id ? " is-active" : ""}`}
              style={{ background: color.value }}
              aria-label={color.label}
              title={color.label}
              data-agent-id={`inspector.text-color.${color.id}`}
              data-agent-role="button"
              data-agent-label={`文字颜色${color.label}`}
              onClick={() => onChange({ color: color.id })}
            />
          ))}
        </div>
      </div>
      <div className="text-style__row">
        <span className="text-style__label">位置</span>
        <div className="text-style__options">
          {POSITIONS.map((position) => (
            <button
              key={position.id}
              type="button"
              className={`mini-button${style.position === position.id ? " is-active" : ""}`}
              data-agent-id={`inspector.text-position.${position.id}`}
              data-agent-role="button"
              data-agent-label={`文字位置${position.label}`}
              onClick={() => onChange({ position: position.id })}
            >
              {position.label}
            </button>
          ))}
        </div>
      </div>
      <div className="text-style__row">
        <span className="text-style__label">入场</span>
        <div className="text-style__options">
          {ANIMATIONS.map((animation) => (
            <button
              key={animation.id}
              type="button"
              className={`mini-button${(style.animation ?? "none") === animation.id ? " is-active" : ""}`}
              data-agent-id={`inspector.text-animation.${animation.id}`}
              data-agent-role="button"
              data-agent-label={`文字入场${animation.label}`}
              onClick={() => onChange({ animation: animation.id })}
            >
              {animation.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
