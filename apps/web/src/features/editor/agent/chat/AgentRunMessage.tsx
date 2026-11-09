import { Sparkles } from "lucide-react";
import { AgentToolStepRow } from "./AgentToolStepRow";
import { ThinkingBlock } from "./ThinkingBlock";
import {
  formatElapsed,
  isRunActive,
  runStatusLabel,
  type AgentFeedMessage,
} from "../feed";

interface AgentRunMessageProps {
  message: AgentFeedMessage;
  now: number;
  onRetry?: (runId: string) => void;
  onUndo?: (runId: string) => void;
}

export function AgentRunMessage({ message, now, onRetry, onUndo }: AgentRunMessageProps) {
  const steps = message.steps ?? [];
  const active = isRunActive(message);
  const startedAt = message.startedAt ?? 0;
  const elapsed = startedAt
    ? Math.max(0, (message.endedAt ?? (active ? now : startedAt)) - startedAt)
    : 0;
  const status = runStatusLabel(message.status);
  const hasReply = message.text.trim().length > 0;
  const waiting = active && steps.length === 0 && !message.reasoning?.trim();

  return (
    <div
      className={`chat-message chat-message--assistant agent-run${active ? " is-active" : ""}`}
      data-agent-id={`agent.run.${message.id}`}
      data-agent-role="agent-run"
      data-agent-label="AI 运行记录"
    >
      <span className="chat-avatar" aria-hidden="true">
        <Sparkles size={11} strokeWidth={2} />
      </span>
      <div className="agent-run__body">
        <div className="agent-run__head">
          <span className="agent-run__name">ximo-Cut AI</span>
          {status.label && (
            <span className={`agent-run__status is-${status.tone}`}>
              {active && <i className="agent-spinner" />}
              {status.label}
            </span>
          )}
          {steps.length > 0 && <span className="agent-run__meta">{steps.length} 步</span>}
          {elapsed > 0 && <span className="agent-run__meta">{formatElapsed(elapsed)}</span>}
        </div>

        {waiting && (
          <div className="agent-run__waiting">
            <i className="agent-spinner" />
            正在思考…
          </div>
        )}

        <ThinkingBlock text={message.reasoning ?? ""} running={active} />

        {steps.length > 0 && (
          <ol className="agent-steps">
            {steps.map((step) => (
              <AgentToolStepRow key={step.id} step={step} />
            ))}
          </ol>
        )}

        {hasReply && <div className="chat-bubble agent-run__answer">{message.text}</div>}

        {(message.canUndo ||
          message.undone ||
          message.status === "error" ||
          message.status === "stopped") && (
          <div className="agent-run__actions">
            {message.undone ? (
              <span className="agent-run__undone">已撤销本次修改</span>
            ) : (
              message.canUndo && (
                <button
                  type="button"
                  data-agent-id={`agent.undo.${message.id}`}
                  data-agent-role="button"
                  data-agent-label="撤销本次修改"
                  onClick={() => onUndo?.(message.id)}
                >
                  撤销本次修改
                </button>
              )
            )}
            {(message.status === "error" || message.status === "stopped") && (
              <button
                type="button"
                data-agent-id={`agent.retry.${message.id}`}
                data-agent-role="button"
                data-agent-label="重试"
                onClick={() => onRetry?.(message.id)}
              >
                重试
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
