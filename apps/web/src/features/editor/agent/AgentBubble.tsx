import { ChevronDown, Sparkles } from "lucide-react";

interface AgentBubbleProps {
  open: boolean;
  thinking: boolean;
  dragging: boolean;
  style: { left: number; top: number };
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

export function AgentBubble({
  open,
  thinking,
  dragging,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: AgentBubbleProps) {
  return (
    <button
      type="button"
      className={`agent-bubble${open ? " is-open" : ""}${thinking ? " is-thinking" : ""}${dragging ? " is-dragging" : ""}`}
      style={style}
      aria-label={open ? "收起 AI 工作台" : "打开 AI 工作台"}
      title={open ? "收起 AI 工作台" : "AI 工作台 · 助手 / 视频复刻 / 脚本库"}
      data-agent-id="button.agent-bubble"
      data-agent-role="button"
      data-agent-label="AI 工作台"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="agent-bubble__ring" aria-hidden="true" />
      <span className="agent-bubble__core">
        {open ? (
          <ChevronDown size={20} strokeWidth={2.2} />
        ) : (
          <Sparkles size={20} strokeWidth={1.9} />
        )}
      </span>
      {!open && <span className="agent-bubble__label">AI</span>}
    </button>
  );
}
