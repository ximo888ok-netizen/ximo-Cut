import { useEffect, useState } from "react";
import { Film, Plus, Sparkles } from "lucide-react";
import {
  createScript,
  deleteScript,
  duplicateScript,
  listScripts,
  saveScript,
  scriptDuration,
  scriptToSrt,
  type ScriptDoc,
} from "./core/scripts";
import { isTauriRuntime, saveSrtDialog } from "./core/desktop";
import { HomeChrome } from "./home/HomeChrome";
import { ScriptList } from "./scripts/ScriptList";
import { ScriptEditor } from "./scripts/ScriptEditor";
import { ReplicaPanel } from "./agent/ReplicaPanel";
import { loadSettings } from "./core/settings";
import "./scripts/scripts.css";

interface ScriptLibraryPageProps {
  onBackHome: () => void;
  onOpenSettings: () => void;
  onUseScript: (doc: ScriptDoc) => void;
  onToast: (message: string) => void;
  autoReplica?: boolean;
  onConsumeAutoReplica?: () => void;
}

type Mode = "list" | "replica" | "edit";

export function ScriptLibraryPage({
  onBackHome,
  onOpenSettings,
  onUseScript,
  onToast,
  autoReplica,
  onConsumeAutoReplica,
}: ScriptLibraryPageProps) {
  const [mode, setMode] = useState<Mode>("list");
  const [scripts, setScripts] = useState<ScriptDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<ScriptDoc | null>(null);

  const refresh = async () => {
    const next = await listScripts();
    setScripts(next);
    setLoading(false);
    return next;
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (autoReplica) {
      setMode("replica");
      onConsumeAutoReplica?.();
    }
  }, [autoReplica, onConsumeAutoReplica]);

  const openEditor = (doc: ScriptDoc) => {
    setDraft(doc);
    setMode("edit");
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }
    try {
      const saved = await saveScript({ ...draft, title: draft.title.trim() || "未命名脚本" });
      setDraft(saved);
      await refresh();
      onToast(`脚本「${saved.title}」已保存`);
    } catch {
      onToast("保存脚本失败，请检查磁盘空间");
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

  const totalShots = scripts.reduce((sum, doc) => sum + doc.shots.length, 0);
  const totalSeconds = scripts.reduce((sum, doc) => sum + scriptDuration(doc), 0);

  return (
    <HomeChrome
      active="scripts"
      screenId="screen.scripts"
      onSelectDrafts={onBackHome}
      onSelectScripts={() => setMode("list")}
      onOpenSettings={onOpenSettings}
    >
      {mode === "list" && (
        <>
          <div className="home-hero">
            <div className="home-hero__copy">
              <span className="home-eyebrow">SCRIPT ROOM · SHOT BY SHOT</span>
              <h1>视频脚本</h1>
              <p>
                {loading
                  ? "正在读取本地脚本…"
                  : `共 ${scripts.length} 个脚本 · ${totalShots} 个镜头 · 预计 ${totalSeconds.toFixed(0)} 秒素材。`}
              </p>
            </div>
            <div className="home-hero__actions">
              <button
                type="button"
                className="home-button home-button--ghost"
                data-agent-id="library.button.replica"
                data-agent-role="button"
                data-agent-label="从参考视频复刻"
                onClick={() => setMode("replica")}
              >
                <Film size={14} strokeWidth={1.8} />
                从参考视频复刻
              </button>
              <button
                type="button"
                className="home-button home-button--primary"
                data-agent-id="library.button.create"
                data-agent-role="button"
                data-agent-label="新建脚本"
                onClick={() => openEditor(createScript())}
              >
                <Plus size={15} strokeWidth={2} />
                新建脚本
              </button>
            </div>
          </div>

          <ScriptList
            scripts={scripts}
            loading={loading}
            showActions={false}
            onCreate={() => openEditor(createScript())}
            onReplica={() => setMode("replica")}
            onOpen={openEditor}
            onDuplicate={(doc) => void handleDuplicate(doc)}
            onDelete={(doc) => void handleDelete(doc)}
          />
        </>
      )}

      {mode === "replica" && (
        <>
          <div className="home-hero home-hero--compact">
            <div className="home-hero__copy">
              <span className="home-eyebrow">REPLICA · REFERENCE BREAKDOWN</span>
              <h1>复刻参考片</h1>
              <p>选一条参考视频，AI 抽帧拆解成镜头脚本，保存后可以套用到任意草稿的时间线。</p>
            </div>
            <div className="home-hero__actions">
              <button
                type="button"
                className="home-button home-button--ghost"
                data-agent-id="library.button.back-list"
                data-agent-role="button"
                onClick={() => setMode("list")}
              >
                返回脚本库
              </button>
            </div>
          </div>
          <div className="library-replica">
            <ReplicaPanel
              ai={loadSettings().ai}
              onToast={onToast}
              onApply={async (doc) => {
                await refresh();
                onUseScript(doc);
              }}
              onSaved={() => void refresh()}
            />
          </div>
        </>
      )}

      {mode === "edit" && draft && (
        <>
          <div className="home-hero home-hero--compact">
            <div className="home-hero__copy">
              <span className="home-eyebrow">STORYBOARD · EDIT</span>
              <h1>{draft.title || "未命名脚本"}</h1>
              <p>
                {draft.shots.length} 个镜头 · {scriptDuration(draft).toFixed(1)} 秒。改完保存，再一键带进草稿时间线。
              </p>
            </div>
            <div className="home-hero__actions">
              <span className="library-hint">
                <Sparkles size={12} strokeWidth={2} />
                套用前请先在草稿里导入素材
              </span>
            </div>
          </div>
          <ScriptEditor
            doc={draft}
            applyLabel="用此脚本新建草稿"
            onChange={setDraft}
            onBack={() => {
              setDraft(null);
              setMode("list");
              void refresh();
            }}
            onSave={() => void handleSave()}
            onApply={() => onUseScript(draft)}
            onExportSrt={() => void handleExport()}
          />
        </>
      )}
    </HomeChrome>
  );
}
