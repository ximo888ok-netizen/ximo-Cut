import { useEffect, useRef, useState } from "react";
import { Copy, Pencil, Play, Trash2 } from "lucide-react";
import type { DraftMeta } from "./data";
import { formatDraftDuration, formatDraftTime } from "./core/drafts";

interface DraftCardProps {
  draft: DraftMeta;
  index: number;
  onOpen: () => void;
  onRename: (name: string) => Promise<boolean>;
  onDuplicate: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onError: (message: string) => void;
}

export function DraftCard({
  draft,
  index,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onError,
}: DraftCardProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(draft.name);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(draft.name);
  }, [draft.name]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitRename = async () => {
    const next = value.trim();
    if (!next || next === draft.name) {
      setEditing(false);
      setValue(draft.name);
      return;
    }
    setBusy(true);
    const ok = await onRename(next);
    setBusy(false);
    if (ok) {
      setEditing(false);
    } else {
      onError("重命名失败，请稍后再试");
    }
  };

  const remove = async () => {
    setBusy(true);
    const ok = await onDelete();
    setBusy(false);
    if (!ok) {
      onError("删除失败，请稍后再试");
    }
  };

  const duplicate = async () => {
    setBusy(true);
    const ok = await onDuplicate();
    setBusy(false);
    if (!ok) {
      onError("复制草稿失败");
    }
  };

  return (
    <article
      className={`draft-card${busy ? " is-busy" : ""}`}
      style={{ animationDelay: `${Math.min(index, 12) * 38}ms` }}
      data-agent-id={`draft.${draft.id}`}
      data-agent-role="draft"
      data-agent-label={draft.name}
    >
      <button
        type="button"
        className="draft-card__cover"
        onClick={onOpen}
        aria-label={`打开草稿 ${draft.name}`}
        data-agent-id={`draft.open.${draft.id}`}
        data-agent-role="button"
        data-agent-label={`打开草稿 ${draft.name}`}
      >
        {draft.cover ? (
          <img src={draft.cover} alt="" loading="lazy" draggable={false} />
        ) : (
          <span className={`draft-cover draft-cover--${draft.tone}`} />
        )}
        <span className="draft-card__sprocket draft-card__sprocket--top" />
        <span className="draft-card__sprocket draft-card__sprocket--bottom" />
        <span className="draft-card__time">{formatDraftDuration(draft.duration)}</span>
        <span className="draft-card__hover">
          <span className="draft-card__play">
            <Play size={13} strokeWidth={2} fill="currentColor" />
            继续编辑
          </span>
        </span>
      </button>

      <div className="draft-card__actions">
        <button
          type="button"
          aria-label="重命名草稿"
          title="重命名"
          data-agent-id={`draft.rename.${draft.id}`}
          data-agent-role="button"
          onClick={() => setEditing(true)}
        >
          <Pencil size={12} strokeWidth={1.9} />
        </button>
        <button
          type="button"
          aria-label="复制草稿"
          title="复制草稿"
          data-agent-id={`draft.duplicate.${draft.id}`}
          data-agent-role="button"
          onClick={() => void duplicate()}
        >
          <Copy size={12} strokeWidth={1.9} />
        </button>
        <button
          type="button"
          aria-label="删除草稿"
          title="删除草稿"
          data-agent-id={`draft.delete.${draft.id}`}
          data-agent-role="button"
          onClick={() => setConfirming(true)}
        >
          <Trash2 size={12} strokeWidth={1.9} />
        </button>
      </div>

      <div className="draft-card__body">
        {editing ? (
          <input
            ref={inputRef}
            className="draft-card__rename"
            value={value}
            maxLength={60}
            aria-label="草稿名称"
            data-agent-id={`draft.name-input.${draft.id}`}
            data-agent-role="textbox"
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => void commitRename()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void commitRename();
              }
              if (event.key === "Escape") {
                setEditing(false);
                setValue(draft.name);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="draft-card__name"
            onDoubleClick={() => setEditing(true)}
            onClick={onOpen}
          >
            {draft.name}
          </button>
        )}
        <div className="draft-card__meta">
          <span>{formatDraftTime(draft.updatedAt)}</span>
          <span className="draft-card__dot" />
          <span>{draft.clipCount} 个片段</span>
        </div>
      </div>

      {confirming && (
        <div className="draft-card__confirm" role="alertdialog" aria-label="确认删除草稿">
          <span>删除「{draft.name}」？</span>
          <div>
            <button
              type="button"
              data-agent-id={`draft.cancel-delete.${draft.id}`}
              data-agent-role="button"
              onClick={() => setConfirming(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="is-danger"
              data-agent-id={`draft.confirm-delete.${draft.id}`}
              data-agent-role="button"
              onClick={() => void remove()}
            >
              删除
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
