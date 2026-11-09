import type { ReactNode } from "react";

export function SettingsSection({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-section">
      <div className="settings-section__head">
        <h3>{title}</h3>
        <span>{note}</span>
      </div>
      {children}
    </div>
  );
}

export function SettingsField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="settings-field">
      <span className="settings-field__label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      {children}
    </label>
  );
}

export function SettingsToggle({
  label,
  hint,
  checked,
  agentId,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  agentId: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="settings-toggle">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <button
        type="button"
        className={`switch${checked ? " is-on" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-agent-id={agentId}
        data-agent-role="switch"
        data-agent-label={label}
        onClick={() => onChange(!checked)}
      >
        <i />
      </button>
    </div>
  );
}
