import { X } from "lucide-react";
import { reviewGrade, type ReviewReport } from "../core/review";

interface ReviewCardProps {
  report: ReviewReport;
  onDismiss: () => void;
}

export function ReviewCard({ report, onDismiss }: ReviewCardProps) {
  const grade = reviewGrade(report.score);
  const { metrics } = report;

  return (
    <section
      className={`agent-review is-${grade.tone}`}
      data-agent-id="panel.review"
      data-agent-role="panel"
      data-agent-label="审片报告"
    >
      <header className="agent-review__head">
        <span className="agent-review__score">
          {report.score}
          <i>分</i>
        </span>
        <div className="agent-review__title">
          <strong>审片报告</strong>
          <span>{grade.label}</span>
        </div>
        <button
          type="button"
          className="agent-review__close"
          aria-label="关闭审片报告"
          data-agent-id="button.review-close"
          data-agent-role="button"
          data-agent-label="关闭审片报告"
          onClick={onDismiss}
        >
          <X size={12} strokeWidth={2} />
        </button>
      </header>

      <div className="agent-review__metrics">
        <span>{metrics.scenes} 个镜头</span>
        <span>平均 {metrics.avgShot.toFixed(1)}s</span>
        <span>
          {metrics.loudness === null ? "无音频" : `${metrics.loudness.toFixed(1)} LUFS`}
        </span>
        <span>黑场 {(metrics.blackRatio * 100).toFixed(0)}%</span>
        <span>静止 {(metrics.freezeRatio * 100).toFixed(0)}%</span>
      </div>

      <ul className="agent-review__issues">
        {report.issues.map((issue, index) => (
          <li key={`${issue.text}-${index}`} className={`is-${issue.level}`}>
            {issue.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
