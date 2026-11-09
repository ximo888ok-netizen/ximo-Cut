interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  agentId: string;
  disabled: boolean;
  onChange: (value: number) => void;
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  agentId,
  disabled,
  onChange,
}: SliderRowProps) {
  return (
    <div className="slider-row">
      <div className="slider-row__head">
        <span>{label}</span>
        <span>{display}</span>
      </div>
      <input
        type="range"
        className="slider-input"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        data-agent-id={agentId}
        data-agent-role="slider"
        data-agent-label={label}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
