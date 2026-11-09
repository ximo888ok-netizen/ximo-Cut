import { useEffect, useState } from "react";
import type { ScriptDoc } from "../core/scripts";
import {
  createScript,
  deleteScript,
  duplicateScript,
  listScripts,
  saveScript,
  scriptToSrt,
} from "../core/scripts";
import { isTauriRuntime, saveSrtDialog } from "../core/desktop";
import { ScriptEditor } from "../scripts/ScriptEditor";
import { ScriptList } from "../scripts/ScriptList";

interface ScriptPanelProps {
  onToast: (message: string) => void;
  onApply: (doc: ScriptDoc) => Promise<void>;
  onOpenReplica: () => void;
  initialScriptId?: string | null;
  onConsumeInitial?: () => void;
  refreshKey?: number;
}

export function ScriptPanel({
  onToast,
  onApply,
  onOpenReplica,
  initialScriptId,
  onConsumeInitial,
  refreshKey = 0,
}: ScriptPanelProps) {
  const [scripts, setScripts] = useState<ScriptDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<ScriptDoc | null>(null);
  const [applying, setApplying] = useState(false);

  const refresh = async () => {
    const next = await listScripts();
    setScripts(next);
    setLoading(false);
    return next;
  };

  useEffect(() => {
    void refresh();
  }, [refreshKey]);

  useEffect(() => {
    if (!initialScriptId) {
      return;
    }
    void (async () => {
      const list = await refresh();
      const target = list.find((doc) => doc.id === initialScriptId);
      if (target) {
        setDraft(target);
      }
      onConsumeInitial?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScriptId]);

  const handleSave = async () => {
    if (!draft) {
      return;
    }
    try {
      const saved = await saveScript({
        ...draft,
        title: draft.title.trim() || "未命名脚本",
      });
      setDraft(saved);
      await refresh();
      onToast(`脚本「${saved.title}」已保存`);
    } catch {
      onToast("保存脚本失败，请检查磁盘空间");
    }
  };

  const handleApply = async () => {
    if (!draft || applying) {
      return;
    }
    try {
      setApplying(true);
      const saved = await saveScript({ ...draft, title: draft.title.trim() || "未命名脚本" });
      setDraft(saved);
      await onApply(saved);
      await refresh();
    } catch (issue) {
      onToast(issue instanceof Error ? issue.message : "套用脚本失败");
    } finally {
      setApplying(false);
    }
  };

  const handleExport = async () => {
    if (!draft) {
      return;
    }
    const srt = scriptToSrt(draft);
    if (!srt.trim()) {
      onToast("这个脚本还没有台词，无法导出字幕");
      return;
    }
    if (isTauriRuntime) {
      try {
        const path = await saveSrtDialog(`${draft.title}.srt`, srt);
        if (path) {
          onToast(`字幕已导出到 ${path}`);
        }
      } catch {
        onToast("导出字幕失败");
      }
      return;
    }
    const blob = new Blob([srt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.title}.srt`;
    link.click();
    URL.revokeObjectURL(url);
    onToast("字幕已下载");
  };

  const handleDelete = async (doc: ScriptDoc) => {
    try {
      await deleteScript(doc.id);
      await refresh();
      onToast(`已删除脚本「${doc.title}」`);
    } catch {
      onToast("删除脚本失败");
    }
  };

  const handleDuplicate = async (doc: ScriptDoc) => {
    try {
      const copy = await duplicateScript(doc);
      await refresh();
      onToast(`已复制为「${copy.title}」`);
    } catch {
      onToast("复制脚本失败");
    }
  };

  if (draft) {
    return (
      <ScriptEditor
        doc={draft}
        applying={applying}
        onChange={setDraft}
        onBack={() => setDraft(null)}
        onSave={() => void handleSave()}
        onApply={() => void handleApply()}
        onExportSrt={() => void handleExport()}
      />
    );
  }

  return (
    <ScriptList
      scripts={scripts}
      loading={loading}
      onCreate={() => setDraft(createScript())}
      onReplica={onOpenReplica}
      onOpen={(doc) => setDraft(doc)}
      onDuplicate={(doc) => void handleDuplicate(doc)}
      onDelete={(doc) => void handleDelete(doc)}
    />
  );
}
