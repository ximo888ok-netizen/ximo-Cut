import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  FileText,
  Plus,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  SCRIPT_TRANSITIONS,
  SHOT_SIZES,
  emptyShot,
  scriptDuration,
  type ScriptDoc,
  type ScriptShot,
} from "../core/scripts";
import "./scripts.css";

interface ScriptEditorProps {
  doc: ScriptDoc;
  applying?: boolean;
  applyLabel?: string;
  onChange: (doc: ScriptDoc) => void;
  onBack: () => void;
  onSave: () => void;
  onApply: () => void;
  onExportSrt: () => void;
}

export function ScriptEditor({
  doc,
  applying,
  applyLabel = "套用到时间线",
  onChange,
  onBack,
  onSave,
  onApply,
  onExportSrt,
}: ScriptEditorProps) {
  const patchShot = (id: string, patch: Partial<ScriptShot>) => {
    onChange({
      ...doc,
      shots: doc.shots.map((shot) => (shot.id === id ? { ...shot, ...patch } : shot)),
    });
  };

  const moveShot = (index: number, direction: -1 | 1) => {
    const next = [...doc.shots];
    const target = index + direction;
    if (target < 0 || target >= next.length) {
      return;
    }
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...doc, shots: next });
  };

  const removeShot = (index: number) => {
    if (doc.shots.length <= 1) {
      return;
    }
    onChange({ ...doc, shots: doc.shots.filter((_, position) => position !== index) });
  };

  const lineCount = doc.shots.filter((shot) => shot.dialogue.trim()).length;

  return (
    <div className="script-editor" data-agent-id="panel.script-editor" data-agent-role="panel">
      <div className="script-editor__head">
        <button
          type="button"
          className="script-back"
          data-agent-id="script.button.back"
          data-agent-role="button"
          data-agent-label="返回脚本列表"
          onClick={onBack}
        >
          <ArrowLeft size={13} strokeWidth={2} />
          全部脚本
        </button>
        <span className="script-editor__meta">
          {doc.shots.length} 镜 · {scriptDuration(doc).toFixed(1)}s · {lineCount} 句台词
        </span>
      </div>

      <label className="script-title-input">
        <span>脚本标题</span>
        <input
          value={doc.title}
          maxLength={60}
          aria-label="脚本标题"
          data-agent-id="script.input.title"
          data-agent-role="textbox"
          onChange={(event) => onChange({ ...doc, title: event.target.value })}
        />
      </label>

      <div className="script-shots">
        {doc.shots.map((shot, index) => (
          <div className="script-shot" key={shot.id} data-agent-id={`script.shot.${index}`}>
            <div className="script-shot__row">
              <span className="script-shot__index">{String(index + 1).padStart(2, "0")}</span>
              <label className="script-field script-field--duration">
                <span>时长</span>
                <input
                  type="number"
                  min={0.5}
                  max={60}
                  step={0.5}
                  value={shot.duration}
                  aria-label="镜头时长"
                  data-agent-id={`script.shot.duration.${index}`}
                  onChange={(event) => patchShot(shot.id, { duration: Number(event.target.value) })}
                />
              </label>
              <label className="script-field">
                <span>景别</span>
                <select
                  value={shot.shotSize}
                  aria-label="景别"
                  data-agent-id={`script.shot.size.${index}`}
                  onChange={(event) => patchShot(shot.id, { shotSize: event.target.value })}
                >
                  {SHOT_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <label className="script-field">
                <span>转场</span>
                <select
                  value={shot.transition}
                  aria-label="转场"
                  data-agent-id={`script.shot.transition.${index}`}
                  onChange={(event) => patchShot(shot.id, { transition: event.target.value })}
                >
                  {SCRIPT_TRANSITIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <div className="script-shot__tools">
                <button
                  type="button"
                  title="上移"
                  aria-label="上移镜头"
                  disabled={index === 0}
                  onClick={() => moveShot(index, -1)}
                >
                  <ArrowUp size={11} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  title="下移"
                  aria-label="下移镜头"
                  disabled={index === doc.shots.length - 1}
                  onClick={() => moveShot(index, 1)}
                >
                  <ArrowDown size={11} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  title="删除镜头"
                  aria-label="删除镜头"
                  disabled={doc.shots.length <= 1}
                  data-agent-id={`script.shot.delete.${index}`}
                  onClick={() => removeShot(index)}
                >
                  <Trash2 size={11} strokeWidth={2} />
                </button>
              </div>
            </div>
            <input
              className="script-shot__desc"
              value={shot.description}
              placeholder="画面描述：主体、动作、构图、运镜"
              aria-label="画面描述"
              data-agent-id={`script.shot.desc.${index}`}
              onChange={(event) => patchShot(shot.id, { description: event.target.value })}
            />
            <input
              className="script-shot__line"
              value={shot.dialogue}
              placeholder="台词 / 字幕（留空表示没有口播）"
              aria-label="台词字幕"
              data-agent-id={`script.shot.line.${index}`}
              onChange={(event) => patchShot(shot.id, { dialogue: event.target.value })}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="script-add"
        data-agent-id="script.button.add-shot"
        data-agent-role="button"
        data-agent-label="添加镜头"
        onClick={() => onChange({ ...doc, shots: [...doc.shots, emptyShot(doc.shots.length)] })}
      >
        <Plus size={13} strokeWidth={2.2} />
        添加镜头
      </button>

      <div className="script-editor__actions">
        <button
          type="button"
          className="script-action"
          data-agent-id="script.button.save"
          data-agent-role="button"
          data-agent-label="保存脚本"
          onClick={onSave}
        >
          <Save size={13} strokeWidth={1.9} />
          保存
        </button>
        <button
          type="button"
          className="script-action"
          data-agent-id="script.button.export-srt"
          data-agent-role="button"
          data-agent-label="导出 SRT"
          onClick={onExportSrt}
        >
          <FileText size={13} strokeWidth={1.9} />
          导出 SRT
        </button>
        <button
          type="button"
          className="script-action script-action--primary"
          data-agent-id="script.button.apply"
          data-agent-role="button"
          data-agent-label="套用到时间线"
          disabled={applying}
          onClick={onApply}
        >
          <Wand2 size={13} strokeWidth={2} />
          {applying ? "正在套用…" : applyLabel}
        </button>
      </div>
    </div>
  );
}
