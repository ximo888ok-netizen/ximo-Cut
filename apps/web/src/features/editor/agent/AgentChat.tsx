import { useEffect, useRef, useState } from "react";
import { Check, Clock3, RefreshCw, Sparkles } from "lucide-react";
import { formatClock, type PlanShot, type RenderSettings } from "../data";
import type { AgentFeedMessage } from "./feed";
import { AgentRunMessage } from "./chat/AgentRunMessage";

interface AgentChatProps {
  messages: AgentFeedMessage[];
  planShots: PlanShot[];
  thinking: boolean;
  applied: boolean;
  renderSettings: RenderSettings;
  onApply: () => void;
  onRegenerate: () => void;
  onRetryRun?: (runId: string) => void;
  onUndoRun?: (runId: string) => void;
}

export function AgentChat({
  messages,
  planShots,
  thinking,
  applied,
  renderSettings,
  onApply,
  onRegenerate,
  onRetryRun,
  onUndoRun,
}: AgentChatProps) {
  const planDurations = planShots.map((shot) => Number.parseFloat(shot.duration) || 0);
  const planTotal = planDurations.reduce((sum, value) => sum + value, 0);
  const longestShot = planDurations.indexOf(Math.max(0, ...planDurations));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!thinking) {
      return;
    }
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [thinking]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, thinking]);

  return (
    <div
      className="agent-scroll"
      ref={scrollRef}
      data-agent-id="panel.agent"
      data-agent-role="panel"
      data-agent-label="AI 精剪"
    >
      <div className="chat">
        {messages.map((message) =>
          message.role === "assistant" && message.status ? (
            <AgentRunMessage
              message={message}
              now={now}
              onRetry={onRetryRun}
              onUndo={onUndoRun}
              key={message.id}
            />
          ) : (
            <div className={`chat-message chat-message--${message.role}`} key={message.id}>
              {message.role === "assistant" && (
                <span className="chat-avatar" aria-hidden="true">
                  <Sparkles size={11} strokeWidth={2} />
                </span>
              )}
              <div className="chat-bubble">{message.text}</div>
            </div>
          ),
        )}
      </div>

      {planShots.length > 0 && (
        <section className={`plan-card${applied ? " is-applied" : ""}`}>
          <div className="plan-card__head">
            <div>
              <span className="plan-card__eyebrow">
                <Sparkles size={11} strokeWidth={2} />
                建议方案
              </span>
              <h3>
                {Math.round(planTotal)} 秒 · {renderSettings.width}×{renderSettings.height} ·{" "}
                {planShots.length} 个镜头
              </h3>
            </div>
            <span className={`plan-badge${applied ? " is-applied" : ""}`}>
              {applied ? "已应用" : "可编辑"}
            </span>
          </div>

          <div className="plan-shots">
            {planShots.map((shot, index) => (
              <div className="plan-shot" key={shot.id}>
                <span className={`plan-shot__thumb plan-shot__thumb--${shot.tone}`}>
                  <span className="plan-shot__index">{String(index + 1).padStart(2, "0")}</span>
                </span>
                <span className="plan-shot__body">
                  <span className="plan-shot__range">
                    {shot.range}
                    {shot.beat && <em className="plan-shot__beat">{shot.beat}</em>}
                  </span>
                  <span className="plan-shot__title">{shot.title}</span>
                  <span className="plan-shot__note">{shot.note}</span>
                </span>
                <span className="plan-shot__duration">{shot.duration}</span>
              </div>
            ))}
          </div>

          <div className="rhythm">
            <div className="rhythm__head">
              <span>镜头时长</span>
              <span>{planTotal.toFixed(1)}s</span>
            </div>
            <div className="rhythm__bars" aria-hidden="true">
              {planDurations.map((value, index) => (
                <i
                  key={`${index}-${value}`}
                  style={{
                    height: `${Math.max(12, (value / Math.max(1, ...planDurations)) * 100)}%`,
                  }}
                  className={index === longestShot ? "is-accent" : ""}
                />
              ))}
            </div>
          </div>

          <div className="plan-card__foot">
            <span>
              <Clock3 size={11} strokeWidth={1.8} />
              预计成片 {formatClock(planTotal)}
            </span>
            <span>{planShots.length} 个镜头</span>
          </div>

          <div className="plan-actions">
            <button
              type="button"
              className="primary-action"
              data-agent-id="button.apply-plan"
              data-agent-role="button"
              data-agent-label="应用方案"
              onClick={onApply}
              disabled={applied}
            >
              <Check size={14} strokeWidth={2.2} />
              {applied ? "已应用到时间线" : "应用方案"}
            </button>
            <button
              type="button"
              className="secondary-action"
              data-agent-id="button.regenerate-plan"
              data-agent-role="button"
              data-agent-label="重做方案"
              onClick={onRegenerate}
            >
              <RefreshCw size={13} strokeWidth={1.8} />
              重做
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
