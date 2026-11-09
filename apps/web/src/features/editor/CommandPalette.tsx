import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const term = query.trim().toLowerCase();
  const filtered = term
    ? commands.filter(
        (command) =>
          command.label.toLowerCase().includes(term) ||
          command.group.toLowerCase().includes(term) ||
          (command.hint ?? "").toLowerCase().includes(term),
      )
    : commands;
  const safeActive = Math.min(active, Math.max(0, filtered.length - 1));

  const execute = (command: PaletteCommand | undefined) => {
    if (!command) {
      return;
    }
    command.run();
    onClose();
  };

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-label="命令面板"
        data-agent-id="dialog.command-palette"
        data-agent-role="dialog"
        data-agent-label="命令面板"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="palette__search">
          <Search size={15} strokeWidth={1.8} />
          <input
            ref={inputRef}
            value={query}
            placeholder="搜索命令，例如：导入、导出、分割…"
            aria-label="搜索命令"
            data-agent-id="input.command-search"
            data-agent-role="textbox"
            data-agent-label="搜索命令"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((value) => (filtered.length === 0 ? 0 : (value + 1) % filtered.length));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((value) =>
                  filtered.length === 0 ? 0 : (value - 1 + filtered.length) % filtered.length,
                );
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                execute(filtered[safeActive]);
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>

        <div className="palette__list">
          {filtered.length === 0 && <p className="palette__empty">没有匹配的命令</p>}
          {filtered.map((command, index) => (
            <button
              type="button"
              key={command.id}
              className={`palette__item${index === safeActive ? " is-active" : ""}`}
              data-agent-id={`palette.${command.id}`}
              data-agent-role="button"
              data-agent-label={command.label}
              onMouseEnter={() => setActive(index)}
              onClick={() => execute(command)}
            >
              <span className="palette__group">{command.group}</span>
              <span className="palette__label">{command.label}</span>
              {command.hint && <span className="palette__hint">{command.hint}</span>}
              {index === safeActive && <CornerDownLeft size={12} strokeWidth={1.8} />}
            </button>
          ))}
        </div>

        <div className="palette__footer">
          <span>↑↓ 选择</span>
          <span>Enter 执行</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
