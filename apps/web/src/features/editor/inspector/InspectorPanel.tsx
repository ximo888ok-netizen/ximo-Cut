import { MousePointer2 } from "lucide-react";
import {
  DEFAULT_TEXT_STYLE,
  formatTimecode,
  type BlendMode,
  type ClipMask,
  type Keyframe,
  type RenderSettings,
  type TrackClip,
} from "../data";
import { TextStyleControls } from "../TextStyleControls";
import { SliderRow } from "./SliderRow";
import { KeyframeSection } from "./KeyframeSection";
import { clipTransformAt } from "../core/keyframes";
import { AudioAdviceSection } from "./AudioAdviceSection";
import { RenderSettingsSection } from "./RenderSettingsSection";
import type { ClipPatch } from "../core/editorStore";
import type { SpeedRampPreset } from "../core/speedRamp";
import type { AudioAnalysisResult } from "../core/audioAnalysis";

interface InspectorPanelProps {
  selectedClip: TrackClip | null;
  selectedCount: number;
  selectedTrackName: string | null;
  audioAnalysis: AudioAnalysisResult | null;
  duration: number;
  playhead: number;
  renderSettings: RenderSettings;
  rendering: boolean;
  onUpdateClip: (patch: ClipPatch) => void;
  onUpdateTransform: (patch: {
    scale?: number;
    rotation?: number;
    opacity?: number;
    positionX?: number;
    positionY?: number;
  }) => void;
  onSetSpeed: (speed: number) => void;
  onAddKeyframe: (clipId: string, keyframe: Keyframe) => void;
  onRemoveKeyframe: (clipId: string, keyframeId: string) => void;
  onUpdateMask: (mask: ClipMask | undefined) => void;
  onSpeedRamp: (preset: SpeedRampPreset) => void;
  onCustomSpeedRamp: (peakSpeed: number, fraction: number) => void;
  onUpdateBlend: (mode: BlendMode) => void;
  onGroupClips: () => void;
  onUngroupClips: () => void;
  onUpdateRenderSettings: (patch: Partial<RenderSettings>) => void;
  onStartRender: () => void;
  onStartBatchRender: () => void;
}

export function InspectorPanel({
  selectedClip,
  selectedCount,
  selectedTrackName,
  audioAnalysis,
  duration,
  playhead,
  renderSettings,
  rendering,
  onUpdateClip,
  onUpdateTransform,
  onSetSpeed,
  onAddKeyframe,
  onRemoveKeyframe,
  onUpdateMask,
  onSpeedRamp,
  onCustomSpeedRamp,
  onUpdateBlend,
  onGroupClips,
  onUngroupClips,
  onUpdateRenderSettings,
  onStartRender,
  onStartBatchRender,
}: InspectorPanelProps) {
  const transform = selectedClip
    ? clipTransformAt(selectedClip, Math.max(0, playhead - selectedClip.start))
    : null;
  return (
    <aside
      className="inspector-panel"
      data-agent-id="panel.inspector"
      data-agent-role="panel"
      data-agent-label="属性"
    >
      <header className="inspector-panel__head">
        <div>
          <span className="panel-kicker">检查器</span>
          <h2>属性</h2>
        </div>
        <span className="inspector-panel__hint">
          {selectedClip ? selectedClip.name : "未选中片段"}
        </span>
      </header>

      <div className="inspector">
        {selectedCount > 1 && (
          <section className="inspector-section">
            <span className="inspector-section__title">多选</span>
            <p className="keyframe-hint">
              已选择 {selectedCount} 个片段。组合后会一起被选中，方便整体移动或删除。
            </p>
            <div className="mini-button-row">
              <button
                type="button"
                className="mini-button"
                data-agent-id="button.group-clips"
                data-agent-role="button"
                data-agent-label="组合所选片段"
                onClick={onGroupClips}
              >
                组合
              </button>
              <button
                type="button"
                className="mini-button"
                data-agent-id="button.ungroup-clips"
                data-agent-role="button"
                data-agent-label="取消组合"
                onClick={onUngroupClips}
              >
                取消组合
              </button>
            </div>
          </section>
        )}
        <section className="inspector-section">
          <span className="inspector-section__title">片段</span>
          {selectedClip ? (
            <>
              <div className="inspector-clip">
                <span className={`inspector-clip__thumb inspector-clip__thumb--${selectedClip.tone}`} />
                <div>
                  <strong>{selectedClip.name}</strong>
                  <span>
                    {selectedClip.kind === "audio"
                      ? "音频片段"
                      : selectedClip.kind === "text"
                        ? "文字片段"
                        : "视频片段"}
                  </span>
                </div>
              </div>
              <div className="property-row">
                <span>开始</span>
                <span className="property-value">{formatTimecode(selectedClip.start)}</span>
              </div>
              <div className="property-row">
                <span>时长</span>
                <span className="property-value">{selectedClip.duration.toFixed(2)}s</span>
              </div>
              <div className="property-row">
                <span>轨道</span>
                <span className="property-value">
                  {selectedTrackName ??
                    (selectedClip.kind === "audio" ? "音频轨" : "视频轨")}
                </span>
              </div>
            </>
          ) : (
            <div className="inspector-empty-card">
              <MousePointer2 size={15} strokeWidth={1.8} />
              <div>
                <strong>还没有选中片段</strong>
                <span>在时间线上点一下片段，就能调整画面、音频和导出参数。</span>
              </div>
            </div>
          )}
        </section>

        {selectedClip?.kind === "text" && (
          <section className="inspector-section">
            <span className="inspector-section__title">文字内容</span>
            <input
              type="text"
              className="inspector-text-input"
              value={selectedClip.text ?? ""}
              aria-label="文字内容"
              data-agent-id="inspector.text"
              data-agent-role="textbox"
              data-agent-label="文字内容"
              onChange={(event) => onUpdateClip({ text: event.target.value })}
            />
            <TextStyleControls
              value={selectedClip.textStyle}
              onChange={(patch) =>
                onUpdateClip({
                  textStyle: { ...DEFAULT_TEXT_STYLE, ...selectedClip.textStyle, ...patch },
                })
              }
            />
          </section>
        )}

        {(!selectedClip || selectedClip.kind === "video") && (
        <section className={`inspector-section${selectedClip ? "" : " is-muted"}`}>
          <span className="inspector-section__title">变换</span>
          <SliderRow
            label="缩放"
            value={Math.round((transform?.scale ?? 1) * 100)}
            min={10}
            max={300}
            step={1}
            display={`${Math.round((transform?.scale ?? 1) * 100)}%`}
            agentId="inspector.scale"
            disabled={!selectedClip}
            onChange={(value) => onUpdateTransform({ scale: value / 100 })}
          />
          <SliderRow
            label="旋转"
            value={Math.round(transform?.rotation ?? 0)}
            min={-180}
            max={180}
            step={1}
            display={`${Math.round(transform?.rotation ?? 0)}°`}
            agentId="inspector.rotation"
            disabled={!selectedClip}
            onChange={(value) => onUpdateTransform({ rotation: value })}
          />
          <SliderRow
            label="不透明度"
            value={Math.round((transform?.opacity ?? 1) * 100)}
            min={0}
            max={100}
            step={1}
            display={`${Math.round((transform?.opacity ?? 1) * 100)}%`}
            agentId="inspector.opacity"
            disabled={!selectedClip}
            onChange={(value) => onUpdateTransform({ opacity: value / 100 })}
          />
          <SliderRow
            label="水平位置"
            value={Math.round(transform?.positionX ?? 0)}
            min={-100}
            max={100}
            step={1}
            display={`${Math.round(transform?.positionX ?? 0)}%`}
            agentId="inspector.position-x"
            disabled={!selectedClip}
            onChange={(value) => onUpdateTransform({ positionX: value })}
          />
          <SliderRow
            label="垂直位置"
            value={Math.round(transform?.positionY ?? 0)}
            min={-100}
            max={100}
            step={1}
            display={`${Math.round(transform?.positionY ?? 0)}%`}
            agentId="inspector.position-y"
            disabled={!selectedClip}
            onChange={(value) => onUpdateTransform({ positionY: value })}
          />
          <SliderRow
            label="速度"
            value={selectedClip?.speed ?? 1}
            min={0.25}
            max={4}
            step={0.05}
            display={`${(selectedClip?.speed ?? 1).toFixed(2)}x`}
            agentId="inspector.speed"
            disabled={!selectedClip}
            onChange={onSetSpeed}
          />
          <div className="mini-button-row">
            <button
              type="button"
              className="mini-button"
              data-agent-id="button.add-transition-in"
              data-agent-role="button"
              data-agent-label="添加淡入"
              disabled={!selectedClip}
              onClick={() => onUpdateClip({ transitionIn: { type: "fade", duration: 0.5 } })}
            >
              淡入 0.5s
            </button>
            <button
              type="button"
              className="mini-button"
              data-agent-id="button.add-transition-out"
              data-agent-role="button"
              data-agent-label="添加淡出"
              disabled={!selectedClip}
              onClick={() => onUpdateClip({ transitionOut: { type: "fade", duration: 0.5 } })}
            >
              淡出 0.5s
            </button>
          </div>
        </section>
        )}

        {selectedClip?.kind === "video" && (
          <KeyframeSection
            clip={selectedClip}
            playhead={playhead}
            onAdd={(keyframe) => onAddKeyframe(selectedClip.id, keyframe)}
            onRemove={(keyframeId) => onRemoveKeyframe(selectedClip.id, keyframeId)}
            onUpdateMask={onUpdateMask}
            onSpeedRamp={onSpeedRamp}
            onCustomSpeedRamp={onCustomSpeedRamp}
            onUpdateBlend={onUpdateBlend}
          />
        )}

        {(!selectedClip || selectedClip.kind !== "text") && (
        <section className={`inspector-section${selectedClip ? "" : " is-muted"}`}>
          <span className="inspector-section__title">音频</span>
          <SliderRow
            label="音量"
            value={selectedClip?.volumeDb ?? 0}
            min={-60}
            max={12}
            step={0.5}
            display={`${(selectedClip?.volumeDb ?? 0).toFixed(1)} dB`}
            agentId="inspector.volume"
            disabled={!selectedClip}
            onChange={(value) => onUpdateClip({ volumeDb: value })}
          />
          <div className="toggle-row">
            <span>静音片段</span>
            <button
              type="button"
              className={`switch${selectedClip?.muted ? " is-on" : ""}`}
              aria-label="静音片段"
              aria-pressed={Boolean(selectedClip?.muted)}
              data-agent-id="inspector.clip-mute"
              data-agent-role="switch"
              data-agent-label="静音片段"
              disabled={!selectedClip}
              onClick={() => onUpdateClip({ muted: !selectedClip?.muted })}
            >
              <i />
            </button>
          </div>
          {selectedClip?.kind === "audio" && (
            <div className="toggle-row">
              <span>自动闪避</span>
              <button
                type="button"
                className={`switch${selectedClip?.ducking ? " is-on" : ""}`}
                aria-label="自动闪避"
                aria-pressed={Boolean(selectedClip?.ducking)}
                data-agent-id="inspector.ducking"
                data-agent-role="switch"
                data-agent-label="自动闪避"
                title="有视频原声时自动压低这段配乐"
                onClick={() => onUpdateClip({ ducking: !selectedClip?.ducking })}
              >
                <i />
              </button>
            </div>
          )}
          <div className="toggle-row">
            <span>降噪</span>
            <button
              type="button"
              className={`switch${selectedClip?.denoise ? " is-on" : ""}`}
              aria-label="降噪"
              aria-pressed={Boolean(selectedClip?.denoise)}
              data-agent-id="inspector.denoise"
              data-agent-role="switch"
              data-agent-label="降噪"
              disabled={!selectedClip}
              onClick={() => onUpdateClip({ denoise: !selectedClip?.denoise })}
            >
              <i />
            </button>
          </div>
          <div className="mini-button-row">
            <button
              type="button"
              className="mini-button"
              data-agent-id="button.audio.fade-in"
              data-agent-role="button"
              data-agent-label="音频淡入"
              disabled={!selectedClip}
              onClick={() => onUpdateClip({ fadeIn: selectedClip?.fadeIn ? 0 : 0.5 })}
            >
              {selectedClip?.fadeIn ? "取消淡入" : "淡入"}
            </button>
            <button
              type="button"
              className="mini-button"
              data-agent-id="button.audio.fade-out"
              data-agent-role="button"
              data-agent-label="音频淡出"
              disabled={!selectedClip}
              onClick={() => onUpdateClip({ fadeOut: selectedClip?.fadeOut ? 0 : 0.5 })}
            >
              {selectedClip?.fadeOut ? "取消淡出" : "淡出"}
            </button>
            <button
              type="button"
              className={`mini-button${selectedClip?.normalized ? " is-active" : ""}`}
              data-agent-id="button.audio.normalize"
              data-agent-role="button"
              data-agent-label="响度归一化"
              disabled={!selectedClip}
              onClick={() => onUpdateClip({ normalized: !selectedClip?.normalized })}
            >
              {selectedClip?.normalized ? "取消归一化" : "归一化"}
            </button>
          </div>
        </section>
        )}

        {audioAnalysis && (
          <section className="inspector-section">
            <span className="inspector-section__title">音频分析</span>
            <div className="property-row">
              <span>文件</span>
              <span className="property-value">{audioAnalysis.file_name}</span>
            </div>
            <div className="property-row">
              <span>采样率</span>
              <span className="property-value">{audioAnalysis.sample_rate} Hz</span>
            </div>
            <div className="property-row">
              <span>峰值 / RMS</span>
              <span className="property-value">
                {audioAnalysis.peak_db} / {audioAnalysis.rms_db} dB
              </span>
            </div>
            <div className="property-row">
              <span>估算响度</span>
              <span className="property-value">{audioAnalysis.estimated_lufs} LUFS</span>
            </div>
            <div className="property-row">
              <span>BPM</span>
              <span className="property-value">{audioAnalysis.bpm ?? "未识别"}</span>
            </div>
            <div className="property-row">
              <span>静音段</span>
              <span className="property-value">{audioAnalysis.silence_ranges.length} 处</span>
            </div>
          </section>
        )}

        <RenderSettingsSection
          renderSettings={renderSettings}
          duration={duration}
          rendering={rendering}
          onUpdateRenderSettings={onUpdateRenderSettings}
          onStartRender={onStartRender}
          onStartBatchRender={onStartBatchRender}
        />

        <AudioAdviceSection audioAnalysis={audioAnalysis} />
      </div>
    </aside>
  );
}

