import { ShieldAlert } from "lucide-react";

interface AgentApprovalBarProps {
  action: string;
  detail: string;
  onApprove: () => void;
  onReject: () => void;
}

export function AgentApprovalBar({ action, detail, onApprove, onReject }: AgentApprovalBarProps) {
  return (
    <div
      className="agent-approval"
      role="alertdialog"
      aria-label="AI 操作确认"
      data-agent-id="panel.agent-approval"
    >
      <span className="agent-approval__mark">
        <ShieldAlert size={14} strokeWidth={1.9} />
      </span>
      <div className="agent-approval__body">
        <strong>{action}</strong>
        <span>{detail}</span>
      </div>
      <div className="agent-approval__actions">
        <button
          type="button"
          data-agent-id="agent.approval.reject"
          data-agent-role="button"
          data-agent-label="拒绝"
          onClick={onReject}
        >
          拒绝
        </button>
        <button
          type="button"
          className="is-primary"
          data-agent-id="agent.approval.approve"
          data-agent-role="button"
          data-agent-label="允许"
          onClick={onApprove}
        >
          允许
        </button>
      </div>
    </div>
  );
}
