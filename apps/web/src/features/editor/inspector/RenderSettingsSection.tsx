import type { RenderSettings } from "../data";
import { SliderRow } from "./SliderRow";

interface RenderSettingsSectionProps {
  renderSettings: RenderSettings;
  duration: number;
  rendering: boolean;
  onUpdateRenderSettings: (patch: Partial<RenderSettings>) => void;
  onStartRender: () => void;
  onStartBatchRender: () => void;
}

export function RenderSettingsSection({
  renderSettings,
  duration,
  rendering,
  onUpdateRenderSettings,
  onStartRender,
  onStartBatchRender,
}: RenderSettingsSectionProps) {
  return (
    <section className="inspector-section">
      <span className="inspector-section__title">导出设置</span>
      <div className="property-row">
        <span>分辨率</span>
        <select
          className="inspector-select"
          value={`${renderSettings.width}x${renderSettings.height}`}
          aria-label="导出分辨率"
          data-agent-id="render.resolution"
          data-agent-role="select"
          data-agent-label="导出分辨率"
          onChange={(event) => {
            const [width, height] = event.target.value.split("x").map(Number);
            onUpdateRenderSettings({ width, height });
          }}
        >
          <option value="1920x1080">1920 × 1080</option>
          <option value="1080x1920">1080 × 1920</option>
          <option value="1280x720">1280 × 720</option>
        </select>
      </div>
      <div className="property-row">
        <span>格式</span>
        <select
          className="inspector-select"
          value={renderSettings.format}
          aria-label="导出格式"
          data-agent-id="render.format"
          data-agent-role="select"
          data-agent-label="导出格式"
          onChange={(event) =>
            onUpdateRenderSettings({ format: event.target.value as "mp4" | "webm" })
          }
        >
          <option value="mp4">MP4</option>
          <option value="webm">WebM</option>
        </select>
      </div>
      <div className="property-row">
        <span>码率</span>
        <select
          className="inspector-select"
          value={renderSettings.bitrate}
          aria-label="导出码率"
          data-agent-id="render.bitrate"
          data-agent-role="select"
          data-agent-label="导出码率"
          onChange={(event) => onUpdateRenderSettings({ bitrate: event.target.value })}
        >
          <option value="8 Mbps">8 Mbps</option>
          <option value="12 Mbps">12 Mbps</option>
          <option value="20 Mbps">20 Mbps</option>
        </select>
      </div>
      <div className="toggle-row">
        <span>字幕烧录</span>
        <button
          type="button"
          className={`switch${renderSettings.burnSubtitles ? " is-on" : ""}`}
          aria-label="字幕烧录"
          aria-pressed={renderSettings.burnSubtitles}
          data-agent-id="render.burn-subtitles"
          data-agent-role="switch"
          data-agent-label="字幕烧录"
          onClick={() =>
            onUpdateRenderSettings({ burnSubtitles: !renderSettings.burnSubtitles })
          }
        >
          <i />
        </button>
      </div>
      <SliderRow
        label="导出起点"
        value={renderSettings.rangeStart}
        min={0}
        max={duration}
        step={0.1}
        display={`${renderSettings.rangeStart.toFixed(1)}s`}
        agentId="render.range-start"
        disabled={false}
        onChange={(value) => onUpdateRenderSettings({ rangeStart: value })}
      />
      <SliderRow
        label="导出终点"
        value={renderSettings.rangeEnd}
        min={0}
        max={duration}
        step={0.1}
        display={`${renderSettings.rangeEnd.toFixed(1)}s`}
        agentId="render.range-end"
        disabled={false}
        onChange={(value) => onUpdateRenderSettings({ rangeEnd: value })}
      />
      <button
        type="button"
        className="primary-action"
        data-agent-id="button.render-start"
        data-agent-role="button"
        data-agent-label="导出视频"
        onClick={onStartRender}
        disabled={rendering}
      >
        {rendering ? "正在导出…" : "导出视频"}
      </button>
      <button
        type="button"
        className="mini-button render-batch-button"
        data-agent-id="button.render-batch"
        data-agent-role="button"
        data-agent-label="批量导出当前与竖屏"
        onClick={onStartBatchRender}
        disabled={rendering}
      >
        批量导出（当前 + 竖屏）
      </button>
    </section>
  );
}
