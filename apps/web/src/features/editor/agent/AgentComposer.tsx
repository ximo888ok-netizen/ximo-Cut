import { Clapperboard, ScanEye, Send, Sparkles, Square } from "lucide-react";

interface AgentComposerProps {
  input: string;
  thinking: boolean;
  quickCutBusy?: boolean;
  storyBusy?: boolean;
  reviewBusy?: boolean;
  onChangeInput: (value: string) => void;
  onSend: (text?: string) => void;
  onStop: () => void;
  onQuickCut?: () => void;
  onStory?: () => void;
  onReview?: () => void;
}

const promptChips = ["节奏再快一点", "字幕大一点", "保留更多环境声"];

export function AgentComposer({
  input,
  thinking,
  quickCutBusy,
  storyBusy,
  reviewBusy,
  onChangeInput,
  onSend,
  onStop,
  onQuickCut,
  onStory,
  onReview,
}: AgentComposerProps) {
  return (
    <div className="agent-composer">
      {(onQuickCut || onStory || onReview) && (
        <div className="composer-actions">
          {onQuickCut && (
            <button
              type="button"
              className="quickcut-button"
              data-agent-id="button.quickcut"
              data-agent-role="button"
              data-agent-label="一键快剪"
              onClick={onQuickCut}
              disabled={thinking || quickCutBusy}
            >
              <Sparkles size={13} strokeWidth={2} />
              {quickCutBusy ? "快剪中…" : "一键快剪"}
              <span>分析素材 · 踩点配乐 · 自动字幕</span>
            </button>
          )}
          {onStory && (
            <button
              type="button"
              className="story-button"
              data-agent-id="button.story-plan"
              data-agent-role="button"
              data-agent-label="精剪方案"
              onClick={onStory}
              disabled={thinking || storyBusy}
            >
              <Clapperboard size={13} strokeWidth={2} />
              {storyBusy ? "规划中…" : "精剪方案"}
            </button>
          )}
          {onReview && (
            <button
              type="button"
              className="review-button"
              data-agent-id="button.review"
              data-agent-role="button"
              data-agent-label="审片"
              onClick={onReview}
              disabled={thinking || reviewBusy}
            >
              <ScanEye size={13} strokeWidth={2} />
              {reviewBusy ? "审片中…" : "审片"}
            </button>
          )}
        </div>
      )}
      <div className="prompt-chips">
        {promptChips.map((chip) => (
          <button
            type="button"
            key={chip}
            data-agent-id={`prompt.${chip}`}
            data-agent-role="button"
            data-agent-label={chip}
            onClick={() => onSend(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="composer-box">
        <input
          value={input}
          onChange={(event) => onChangeInput(event.target.value)}
          data-agent-id="input.agent-command"
          data-agent-role="textbox"
          data-agent-label="给 AI 的剪辑指令"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="告诉 AI 你想怎么改…"
          aria-label="给 AI 的剪辑指令"
        />
        <button
          type="button"
          className="send-button"
          aria-label={thinking ? "停止 AI" : "发送指令"}
          data-agent-id={thinking ? "button.agent-stop" : "button.send"}
          data-agent-role="button"
          data-agent-label={thinking ? "停止 AI" : "发送指令"}
          onClick={() => (thinking ? onStop() : onSend())}
          disabled={!thinking && !input.trim()}
        >
          {thinking ? <Square size={12} strokeWidth={2.4} /> : <Send size={14} strokeWidth={1.9} />}
        </button>
      </div>
      <span className="composer-hint">AI 会先给出方案，确认后才修改时间线</span>
    </div>
  );
}
