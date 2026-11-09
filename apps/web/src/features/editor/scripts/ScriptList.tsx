import { Copy, Film, Plus, Trash2 } from "lucide-react";
import type { ScriptDoc } from "../core/scripts";
import { formatDraftTime } from "../core/drafts";
import "./scripts.css";

interface ScriptListProps {
  scripts: ScriptDoc[];
  loading: boolean;
  showActions?: boolean;
  onCreate: () => void;
  onReplica: () => void;
  onOpen: (doc: ScriptDoc) => void;
  onDuplicate: (doc: ScriptDoc) => void;
  onDelete: (doc: ScriptDoc) => void;
}

export function ScriptList({
  scripts,
  loading,
  showActions = true,
  onCreate,
  onReplica,
  onOpen,
  onDuplicate,
  onDelete,
}: ScriptListProps) {
  if (loading) {
    return (
      <div className="script-list">
        {[0, 1].map((item) => (
          <div className="script-card script-card--skeleton" key={item}>
            <span />
            <span />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="script-wrap">
      {showActions && (
        <div className="script-actions">
          <button
            type="button"
            className="script-action script-action--primary"
            data-agent-id="script.button.create"
            data-agent-role="button"
            data-agent-label="新建脚本"
            onClick={onCreate}
          >
            <Plus size={13} strokeWidth={2.2} />
            新建脚本
          </button>
          <button
            type="button"
            className="script-action"
            data-agent-id="script.button.replica"
            data-agent-role="button"
            data-agent-label="从参考视频复刻"
            onClick={onReplica}
          >
            <Film size={13} strokeWidth={1.9} />
            从参考视频复刻
          </button>
        </div>
      )}

      {scripts.length === 0 ? (
        <div className="script-empty">
          <strong>还没有脚本</strong>
          <p>新建一个分镜脚本，或上传参考视频让 AI 拆解出镜头结构。</p>
        </div>
      ) : (
        <div className="script-list">
          {scripts.map((doc) => (
            <article className="script-card" key={doc.id} data-agent-id={`script.card.${doc.id}`}>
              <button
                type="button"
                className="script-card__main"
                data-agent-id={`script.open.${doc.id}`}
                data-agent-role="button"
                data-agent-label={`打开脚本 ${doc.title}`}
                onClick={() => onOpen(doc)}
              >
                <span className="script-card__badge">
                  {doc.source === "replica" ? "复刻" : "手写"}
                </span>
                <strong>{doc.title}</strong>
                <span className="script-card__meta">
                  {doc.shots.length} 个镜头 · {formatDuration(doc)} · {formatDraftTime(doc.updatedAt)}
                </span>
                {doc.referenceName && (
                  <span className="script-card__ref">参考 · {doc.referenceName}</span>
                )}
              </button>
              <div className="script-card__tools">
                <button
                  type="button"
                  title="复制脚本"
                  aria-label="复制脚本"
                  data-agent-id={`script.duplicate.${doc.id}`}
                  onClick={() => onDuplicate(doc)}
                >
                  <Copy size={12} strokeWidth={1.9} />
                </button>
                <button
                  type="button"
                  title="删除脚本"
                  aria-label="删除脚本"
                  data-agent-id={`script.delete.${doc.id}`}
                  onClick={() => onDelete(doc)}
                >
                  <Trash2 size={12} strokeWidth={1.9} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDuration(doc: ScriptDoc): string {
  const total = doc.shots.reduce((sum, shot) => sum + shot.duration, 0);
  return `${total.toFixed(1)}s`;
}
