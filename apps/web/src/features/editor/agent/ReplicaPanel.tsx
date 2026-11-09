import { useState } from "react";
import { Film, Loader2, ScanLine, Sparkles, Wand2 } from "lucide-react";
import type { AiSettings } from "../core/settings";
import { analyzeReferenceVideo } from "../core/qwenVision";
import { saveScript, scriptDuration, type ScriptDoc } from "../core/scripts";
import { isTauriRuntime, pickReferenceVideo } from "../core/desktop";

interface ReplicaPanelProps {
  ai: AiSettings;
  onToast: (message: string) => void;
  onApply: (doc: ScriptDoc) => Promise<void>;
  onSaved?: () => void;
}

export function ReplicaPanel({ ai, onToast, onApply, onSaved }: ReplicaPanelProps) {
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<ScriptDoc | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const runReplica = async () => {
    if (busy) {
      return;
    }
    if (!isTauriRuntime) {
      onToast("视频复刻需要在桌面版使用（依赖本地 FFmpeg 抽帧）");
      return;
    }
    try {
      const file = await pickReferenceVideo();
      if (!file) {
        return;
      }
      setBusy(true);
      setError(null);
      setDoc(null);
      setStage("准备分析参考视频…");
      const result = await analyzeReferenceVideo({
        filePath: file.path,
        fileName: file.name,
        ai,
        onStage: setStage,
      });
      setDoc(result);
      setTitle(result.title);
      setStage(null);
      onToast(`已拆解 ${result.shots.length} 个镜头`);
    } catch (issue) {
      setStage(null);
      setError(issue instanceof Error ? issue.message : "视频复刻失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const persist = async (): Promise<ScriptDoc | null> => {
    if (!doc) {
      return null;
    }
    const saved = await saveScript({ ...doc, title: title.trim() || doc.title });
    setDoc(saved);
    return saved;
  };

  const handleSave = async () => {
    try {
      const saved = await persist();
      if (saved) {
        onSaved?.();
        onToast(`脚本「${saved.title}」已保存`);
      }
    } catch {
      onToast("保存脚本失败，请检查磁盘空间");
    }
  };

  const handleApply = async () => {
    try {
      const saved = await persist();
      if (!saved) {
        return;
      }
      await onApply(saved);
      onSaved?.();
    } catch (issue) {
      onToast(issue instanceof Error ? issue.message : "套用脚本失败");
    }
  };

  return (
    <div className="replica-panel" data-agent-id="panel.replica" data-agent-role="panel" data-agent-label="视频复刻">
      <div className="replica-intro">
        <span className="replica-intro__mark">
          <ScanLine size={17} strokeWidth={1.7} />
        </span>
        <div>
          <strong>拆解一条参考片</strong>
          <p>AI 抽取关键帧，输出镜头时长、景别、画面描述和台词，再用你的素材复刻同样节奏。</p>
        </div>
      </div>

      <button
        type="button"
        className="replica-pick"
        data-agent-id="replica.button.pick"
        data-agent-role="button"
        data-agent-label="选择参考视频"
        onClick={() => void runReplica()}
        disabled={busy}
      >
        {busy ? <Loader2 size={15} className="is-spinning" /> : <Film size={15} strokeWidth={1.8} />}
        {busy ? "正在拆解…" : doc ? "换一条参考视频" : "选择参考视频"}
      </button>

      {stage && (
        <div className="replica-stage" role="status">
          <span className="replica-stage__bar" />
          <span>{stage}</span>
        </div>
      )}

      {error && (
        <div className="replica-error" role="alert">
          {error}
        </div>
      )}

      {doc && (
        <div className="replica-result">
          <label className="replica-title">
            <span>脚本标题</span>
            <input
              value={title}
              maxLength={60}
              aria-label="脚本标题"
              data-agent-id="replica.input.title"
              data-agent-role="textbox"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <div className="replica-meta">
            <span>{doc.shots.length} 个镜头</span>
            <span>{scriptDuration(doc).toFixed(1)} 秒</span>
            {doc.referenceName && <span>参考 · {doc.referenceName}</span>}
          </div>

          <div className="replica-shots">
            {doc.shots.map((shot, index) => (
              <div className="replica-shot" key={shot.id}>
                <span className="replica-shot__index">{String(index + 1).padStart(2, "0")}</span>
                <div className="replica-shot__body">
                  <span className="replica-shot__desc">
                    <em>{shot.shotSize}</em>
                    {shot.description || "（未描述）"}
                  </span>
                  {shot.dialogue && <span className="replica-shot__line">「{shot.dialogue}」</span>}
                </div>
                <span className="replica-shot__duration">{shot.duration.toFixed(1)}s</span>
              </div>
            ))}
          </div>

          <div className="replica-actions">
            <button
              type="button"
              className="replica-button replica-button--ghost"
              data-agent-id="replica.button.save"
              data-agent-role="button"
              onClick={() => void handleSave()}
            >
              保存脚本
            </button>
            <button
              type="button"
              className="replica-button replica-button--primary"
              data-agent-id="replica.button.apply"
              data-agent-role="button"
              onClick={() => void handleApply()}
            >
              <Wand2 size={13} strokeWidth={2} />
              保存并套用到时间线
            </button>
          </div>

          <p className="replica-note">
            <Sparkles size={11} strokeWidth={2} />
            套用时会按顺序复用素材库里的视频/图片；素材比镜头短会自动按素材长度收窄。
          </p>
        </div>
      )}
    </div>
  );
}
