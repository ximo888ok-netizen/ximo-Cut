import { useState } from "react";
import {
  Check,
  ChevronRight,
  Download,
  Eye,
  Film,
  ListTree,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { formatElapsed, type AgentToolStep } from "../feed";
import { formatJson } from "../feedResult";

interface AgentToolStepRowProps {
  step: AgentToolStep;
}

export function AgentToolStepRow({ step }: AgentToolStepRowProps) {
  const [open, setOpen] = useState(false);
  const Icon = iconFor(step.name);
  const delta = step.endedAt ? step.endedAt - step.startedAt : 0;
  const duration = delta > 0 ? formatElapsed(delta) : "";
  const expandable = step.args !== undefined || Boolean(step.result);

  return (
    <li className={`agent-step is-${step.status}${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="agent-step__row"
        aria-expanded={expandable ? open : undefined}
        data-agent-id={`agent.step.${step.id}`}
        data-agent-role="button"
        data-agent-label={step.title}
        onClick={() => {
          if (expandable) {
            setOpen((current) => !current);
          }
        }}
      >
        <span className="agent-step__mark">
          <Icon size={12} strokeWidth={1.8} />
        </span>
        <span className="agent-step__body">
          <span className="agent-step__title">{step.title}</span>
          {step.status === "error" && step.result ? (
            <span className="agent-step__error">{step.result}</span>
          ) : (
            step.detail && <span className="agent-step__detail">{step.detail}</span>
          )}
        </span>
        {duration && <span className="agent-step__time">{duration}</span>}
        <span className="agent-step__state">
          {step.status === "running" ? (
            <i className="agent-spinner" />
          ) : step.status === "error" ? (
            <X size={11} strokeWidth={2.2} />
          ) : (
            <Check size={11} strokeWidth={2.2} />
          )}
        </span>
        {expandable && <ChevronRight size={11} className="agent-step__chevron" />}
      </button>
      {open && (
        <div className="agent-step__panel">
          {step.args !== undefined && (
            <div className="agent-step__block">
              <span>参数</span>
              <pre>{formatJson(step.args)}</pre>
            </div>
          )}
          {step.result && (
            <div className="agent-step__block">
              <span>结果</span>
              <pre>{step.output === undefined ? step.result : formatJson(step.output)}</pre>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function iconFor(name: string) {
  if (name === "ui_snapshot" || name === "project_get_state") return Eye;
  if (name === "ui_click") return MousePointerClick;
  if (name === "ui_set_value") return SlidersHorizontal;
  if (name === "preview_play") return Play;
  if (name === "preview_pause") return Pause;
  if (name === "preview_seek") return Film;
  if (name.startsWith("render_")) return Download;
  if (name === "plan_propose") return Wand2;
  if (name.startsWith("timeline_split") || name.startsWith("timeline_trim")) return Scissors;
  if (name.startsWith("timeline_delete")) return Trash2;
  if (name.startsWith("timeline_add")) return Plus;
  if (name.startsWith("timeline")) return Film;
  if (name.startsWith("audio")) return ListTree;
  return Sparkles;
}
