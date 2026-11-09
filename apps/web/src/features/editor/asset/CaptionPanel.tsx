import { Captions, FileText, Loader2 } from "lucide-react";
import type { CaptionCue, TextStyle } from "../data";
import { SUBTITLE_PRESETS } from "../core/presets";

interface CaptionPanelProps {
  captions: CaptionCue[];
  busy?: boolean;
  onSelectCaption: (cue: CaptionCue) => void;
  onAutoCaption: () => void;
  onImportSrt: () => void;
  onApplySubtitlePreset: (style: TextStyle, label: string) => void;
}

export function CaptionPanel({
  captions,
  busy,
  onSelectCaption,
  onAutoCaption,
  onImportSrt,
  onApplySubtitlePreset,
}: CaptionPanelProps) {
  return (
    <div className="caption-list">
      <div className="caption-list__summary">
        <span>字幕样式</span>
        <span className="status-chip">{SUBTITLE_PRESETS.length} 种</span>
      </div>
      <div className="subtitle-styles">
        {SUBTITLE_PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className="subtitle-style"
            data-agent-id={`subtitle.${preset.id}`}
            data-agent-role="button"
            data-agent-label={preset.label}
            title={
              preset.style.position === "top"
                ? "套用到画面上方"
                : preset.style.background
                  ? "带底条样式"
                  : "描边字幕"
            }
            onClick={() => onApplySubtitlePreset(preset.style, preset.label)}
          >
            <span
              className="subtitle-style__sample"
              style={{
                color: preset.style.color,
                fontWeight: preset.style.bold ? 700 : 400,
                background: preset.style.background
                  ? preset.style.backgroundColor
                  : undefined,
                padding: preset.style.background ? "0.06em 0.24em" : undefined,
                borderRadius: preset.style.background ? "0.14em" : undefined,
                textShadow: preset.style.stroke
                  ? `0 0 ${Math.max(1, preset.style.stroke)}px ${preset.style.strokeColor ?? "black"}`
                  : undefined,
              }}
            >
              Aa
            </span>
            <em>{preset.label}</em>
          </button>
        ))}
      </div>

      <div className="caption-list__summary">
        <span>时间线字幕</span>
        <span className="status-chip">{captions.length} 条</span>
      </div>
      <button
        type="button"
        className="quick-action quick-action--wide"
        data-agent-id="button.auto-caption"
        data-agent-role="button"
        data-agent-label="自动识别字幕"
        onClick={onAutoCaption}
        disabled={busy}
      >
        {busy ? (
          <Loader2 size={13} strokeWidth={1.8} className="is-spinning" />
        ) : (
          <Captions size={13} strokeWidth={1.8} />
        )}
        {busy ? "正在识别…" : "自动识别字幕"}
      </button>
      <button
        type="button"
        className="quick-action quick-action--wide"
        data-agent-id="button.import-srt"
        data-agent-role="button"
        data-agent-label="导入 SRT 字幕"
        onClick={onImportSrt}
      >
        <FileText size={13} strokeWidth={1.8} />
        导入 SRT 字幕
      </button>
      {captions.length === 0 && (
        <p className="caption-empty">
          时间线上还没有字幕片段。选一个样式可以直接新建字幕，也可以手动添加文本或导入 .srt。
        </p>
      )}
      {captions.map((cue) => (
        <button
          type="button"
          className="caption-row"
          key={cue.id}
          data-agent-id={`caption.${cue.id}`}
          data-agent-role="caption"
          data-agent-label={cue.text}
          onClick={() => onSelectCaption(cue)}
        >
          <span className="caption-row__time">{cue.time}</span>
          <span className="caption-row__text">{cue.text}</span>
        </button>
      ))}
    </div>
  );
}
