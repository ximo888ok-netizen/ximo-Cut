import type { CSSProperties, ReactNode } from "react";
import { Film, MessageSquare, Sparkles, X } from "lucide-react";

export type AgentTab = "chat" | "replica" | "script";

interface AgentDockProps {
  tab: AgentTab;
  style: CSSProperties;
  thinking: boolean;
  modelLabel: string;
  onTabChange: (tab: AgentTab) => void;
  onClose: () => void;
  onOpenSettings: () => void;
  chat: ReactNode;
  replica: ReactNode;
  scripts: ReactNode;
}

const tabs: Array<{ id: AgentTab; label: string; icon: typeof Sparkles }> = [
  { id: "chat", label: "AI 助手", icon: MessageSquare },
  { id: "replica", label: "视频复刻", icon: Film },
  { id: "script", label: "脚本库", icon: Sparkles },
];

export function AgentDock({
  tab,
  style,
  thinking,
  modelLabel,
  onTabChange,
  onClose,
  onOpenSettings,
  chat,
  replica,
  scripts,
}: AgentDockProps) {
  return (
    <section
      className="agent-dock"
      style={style}
      role="dialog"
      aria-label="AI 工作台"
      data-agent-id="panel.agent-dock"
      data-agent-role="dialog"
      data-agent-label="AI 工作台"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="agent-dock__head">
        <div className="agent-dock__title">
          <span className="agent-dock__mark">
            <Sparkles size={14} strokeWidth={1.9} />
          </span>
          <div>
            <span className="agent-dock__kicker">XIMO CUT · AI</span>
            <h2>工作台</h2>
          </div>
          {thinking && <span className="agent-dock__busy">思考中</span>}
        </div>
        <div className="agent-dock__head-actions">
          <button
            type="button"
            className="agent-dock__model"
            title={`模型设置 · ${modelLabel}`}
            data-agent-id="button.model-select"
            data-agent-role="button"
            data-agent-label="模型设置"
            onClick={onOpenSettings}
          >
            {modelLabel}
          </button>
          <button
            type="button"
            className="agent-dock__close"
            aria-label="收起工作台"
            data-agent-id="button.agent-close"
            data-agent-role="button"
            data-agent-label="收起工作台"
            onClick={onClose}
          >
            <X size={14} strokeWidth={1.9} />
          </button>
        </div>
      </header>

      <nav className="agent-dock__tabs" role="tablist" aria-label="AI 工作台功能">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "is-active" : ""}
              data-agent-id={`agent.tab.${item.id}`}
              data-agent-role="tab"
              data-agent-label={item.label}
              onClick={() => onTabChange(item.id)}
            >
              <Icon size={13} strokeWidth={1.8} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="agent-dock__body">
        {tab === "chat" && chat}
        {tab === "replica" && replica}
        {tab === "script" && scripts}
      </div>
    </section>
  );
}
