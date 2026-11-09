import { CheckCircle2 } from "lucide-react";
import { formatClock } from "./data";

export function StatusBar({
  revision,
  clipCount,
  assetCount,
  duration,
}: {
  revision: number;
  clipCount: number;
  assetCount: number;
  duration: number;
}) {
  return (
    <footer className="statusbar" data-agent-id="statusbar" data-agent-role="statusbar" data-agent-label="状态栏">
      <div className="statusbar__left">
        <span className="status-ok">
          <CheckCircle2 size={11} strokeWidth={2} />
          工程已就绪
        </span>
        <span className="statusbar__divider" />
        <span>{clipCount} 个片段 · 第 {revision} 次修改</span>
        <span className="statusbar__divider" />
        <span className="statusbar__model">本地工程 · 自动记录历史</span>
      </div>
      <div className="statusbar__center">
        <span>{assetCount} 个素材</span>
        <span>时间线 {formatClock(duration)}</span>
      </div>
      <div className="statusbar__right">
        <span>工程数据仅保存在本机</span>
      </div>
    </footer>
  );
}
