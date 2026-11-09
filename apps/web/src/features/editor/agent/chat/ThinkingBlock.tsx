import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

interface ThinkingBlockProps {
  text: string;
  running: boolean;
}

export function ThinkingBlock({ text, running }: ThinkingBlockProps) {
  const [open, setOpen] = useState(true);
  const manual = useRef(false);

  useEffect(() => {
    if (running && !manual.current) {
      setOpen(true);
    }
  }, [running, text.length]);

  if (!text.trim()) {
    return null;
  }

  return (
    <div className={`agent-think${open ? " is-open" : ""}${running ? " is-running" : ""}`}>
      <button
        type="button"
        className="agent-think__toggle"
        aria-expanded={open}
        data-agent-id="agent.thinking"
        data-agent-role="button"
        data-agent-label="思考过程"
        onClick={() => {
          manual.current = true;
          setOpen((current) => !current);
        }}
      >
        <ChevronRight size={11} />
        <span>{running ? "正在思考" : "思考过程"}</span>
        <em>{text.length} 字</em>
      </button>
      {open && <div className="agent-think__body">{text}</div>}
    </div>
  );
}
