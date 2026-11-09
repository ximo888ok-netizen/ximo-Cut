import { useState } from "react";
import { Check, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import {
  BITRATE_OPTIONS,
  DEFAULT_SETTINGS,
  FPS_OPTIONS,
  MODEL_SUGGESTIONS,
  RESOLUTION_OPTIONS,
  type EditorSettings,
} from "../core/settings";
import { SettingsField, SettingsSection, SettingsToggle } from "./SettingsControls";
import type { SettingsSectionsProps } from "./types";

export function SettingsSections({
  tab,
  draft,
  draftId,
  projectPath,
  test,
  onTest,
  onChange,
}: SettingsSectionsProps) {
  const [showKey, setShowKey] = useState(false);
  const updateAi = (patch: Partial<EditorSettings["ai"]>) =>
    onChange({ ...draft, ai: { ...draft.ai, ...patch } });
  const updateExport = (patch: Partial<EditorSettings["exportDefaults"]>) =>
    onChange({
      ...draft,
      exportDefaults: { ...draft.exportDefaults, ...patch },
    });

  if (tab === "ai") {
    return (
      <section>
        <SettingsSection title="AI 模型" note="用于 AI 精剪对话与镜头方案生成">
          <SettingsField label="API 地址" hint="OpenAI 兼容端点，默认千问北京地域">
            <input
              className="settings-input"
              value={draft.ai.baseUrl}
              spellCheck={false}
              data-agent-id="settings.input.base-url"
              data-agent-role="textbox"
              data-agent-label="AI 服务地址"
              onChange={(event) => updateAi({ baseUrl: event.target.value })}
            />
          </SettingsField>
          <div className="settings-field">
            <span className="settings-field__label">
              API Key
              <small>仅保存在本机，不上传到任何第三方</small>
            </span>
            <div className="settings-secret">
              <input
                className="settings-input"
                type={showKey ? "text" : "password"}
                value={draft.ai.apiKey}
                placeholder="sk-..."
                spellCheck={false}
                autoComplete="off"
                aria-label="API Key"
                data-agent-id="settings.input.api-key"
                data-agent-role="textbox"
                data-agent-label="API Key"
                onChange={(event) => updateAi({ apiKey: event.target.value })}
              />
              <button
                type="button"
                className="settings-secret__toggle"
                aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
                data-agent-id="settings.button.toggle-key"
                data-agent-role="button"
                data-agent-label={showKey ? "隐藏 API Key" : "显示 API Key"}
                onClick={() => setShowKey((value) => !value)}
              >
                {showKey ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
              </button>
            </div>
          </div>
          <SettingsField label="模型名称" hint="DashScope 兼容模式支持的模型">
            <input
              className="settings-input"
              list="ximo-cut-model-options"
              value={draft.ai.model}
              spellCheck={false}
              data-agent-id="settings.input.model"
              data-agent-role="textbox"
              data-agent-label="AI 模型名称"
              onChange={(event) => updateAi({ model: event.target.value })}
            />
            <datalist id="ximo-cut-model-options">
              {MODEL_SUGGESTIONS.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </SettingsField>
          <SettingsField
            label={`温度 ${draft.ai.temperature.toFixed(1)}`}
            hint="越高越发散，剪辑指令建议 0.2–0.5"
          >
            <input
              type="range"
              className="settings-range"
              min="0"
              max="1.5"
              step="0.1"
              value={draft.ai.temperature}
              data-agent-id="settings.range.temperature"
              data-agent-role="slider"
              data-agent-label="AI 温度"
              onChange={(event) => updateAi({ temperature: Number(event.target.value) })}
            />
          </SettingsField>
          <SettingsField label="最大输出 Tokens" hint="单次回复上限，范围 256–8192">
            <input
              type="number"
              className="settings-input settings-input--number"
              min="256"
              max="8192"
              step="128"
              value={draft.ai.maxTokens}
              data-agent-id="settings.input.max-tokens"
              data-agent-role="spinbutton"
              data-agent-label="最大输出 Tokens"
              onChange={(event) => {
                const value = Number(event.target.value);
                updateAi({
                  maxTokens: Number.isFinite(value) ? value : DEFAULT_SETTINGS.ai.maxTokens,
                });
              }}
            />
          </SettingsField>

          <div className="settings-test">
            <button
              type="button"
              className="settings-button"
              data-agent-id="settings.button.test"
              data-agent-role="button"
              data-agent-label="测试连接"
              onClick={onTest}
              disabled={test.status === "loading"}
            >
              {test.status === "loading" ? (
                <Loader2 size={13} className="settings-spin" />
              ) : test.status === "ok" ? (
                <Check size={13} />
              ) : (
                <RefreshCw size={13} />
              )}
              测试连接
            </button>
            <span className={`settings-test__status is-${test.status}`}>
              {test.status === "idle" && "尚未测试"}
              {test.status === "loading" && "正在连接…"}
              {test.status === "ok" && test.message}
              {test.status === "warn" && test.message}
              {test.status === "error" && test.message}
            </span>
          </div>
          <p className="settings-note">
            API Key 只保存在本机设置中，不会写入工程文件；仅在请求千问服务时使用。
          </p>
        </SettingsSection>
      </section>
    );
  }

  if (tab === "timeline") {
    return (
      <section>
        <SettingsSection title="导出默认值" note="保存后同步到当前工程的导出设置">
          <SettingsField label="分辨率">
            <select
              className="settings-input"
              value={`${draft.exportDefaults.width}x${draft.exportDefaults.height}`}
              data-agent-id="settings.select.resolution"
              data-agent-role="select"
              data-agent-label="默认导出分辨率"
              onChange={(event) => {
                const [width, height] = event.target.value.split("x").map(Number);
                updateExport({ width, height });
              }}
            >
              {RESOLUTION_OPTIONS.map((option) => (
                <option key={option.label} value={`${option.width}x${option.height}`}>
                  {option.label}
                </option>
              ))}
            </select>
          </SettingsField>
          <div className="settings-row">
            <SettingsField label="帧率">
              <select
                className="settings-input"
                value={draft.exportDefaults.fps}
                data-agent-id="settings.select.fps"
                data-agent-role="select"
                data-agent-label="默认帧率"
                onChange={(event) => updateExport({ fps: Number(event.target.value) })}
              >
                {FPS_OPTIONS.map((fps) => (
                  <option key={fps} value={fps}>
                    {fps} fps
                  </option>
                ))}
              </select>
            </SettingsField>
            <SettingsField label="格式">
              <select
                className="settings-input"
                value={draft.exportDefaults.format}
                data-agent-id="settings.select.format"
                data-agent-role="select"
                data-agent-label="默认导出格式"
                onChange={(event) =>
                  updateExport({
                    format: event.target.value === "webm" ? "webm" : "mp4",
                  })
                }
              >
                <option value="mp4">MP4 · H.264 / AAC</option>
                <option value="webm">WebM · VP9 / Opus</option>
              </select>
            </SettingsField>
          </div>
          <SettingsField label="码率">
            <select
              className="settings-input"
              value={draft.exportDefaults.bitrate}
              data-agent-id="settings.select.bitrate"
              data-agent-role="select"
              data-agent-label="默认码率"
              onChange={(event) => updateExport({ bitrate: event.target.value })}
            >
              {BITRATE_OPTIONS.map((bitrate) => (
                <option key={bitrate} value={bitrate}>
                  {bitrate}
                </option>
              ))}
            </select>
          </SettingsField>
        </SettingsSection>

        <SettingsSection title="时间线" note="作用于当前时间线视图">
          <SettingsField
            label={`默认缩放 ${draft.timeline.defaultZoom.toFixed(2)}×`}
            hint="启动或保存设置后应用"
          >
            <input
              type="range"
              className="settings-range"
              min="1"
              max="10"
              step="0.25"
              value={draft.timeline.defaultZoom}
              data-agent-id="settings.range.zoom"
              data-agent-role="slider"
              data-agent-label="时间线默认缩放"
              onChange={(event) =>
                onChange({
                  ...draft,
                  timeline: {
                    ...draft.timeline,
                    defaultZoom: Number(event.target.value),
                  },
                })
              }
            />
          </SettingsField>
          <SettingsToggle
            label="默认开启吸附"
            hint="拖动与裁剪片段时对齐播放头和相邻片段"
            checked={draft.timeline.snap}
            agentId="settings.switch.snap"
            onChange={(checked) =>
              onChange({
                ...draft,
                timeline: { ...draft.timeline, snap: checked },
              })
            }
          />
        </SettingsSection>
      </section>
    );
  }

  if (tab === "interface") {
    return (
      <section>
        <SettingsSection title="预览" note="影响播放器的默认显示">
          <SettingsToggle
            label="默认显示字幕"
            hint="播放器是否显示文字轨道与字幕的叠加预览"
            checked={draft.preview.showCaptions}
            agentId="settings.switch.captions"
            onChange={(checked) =>
              onChange({
                ...draft,
                preview: { ...draft.preview, showCaptions: checked },
              })
            }
          />
        </SettingsSection>
        <SettingsSection title="素材库" note="影响导入流程">
          <SettingsToggle
            label="导入时生成视频缩略图"
            hint="关闭后导入更快，素材卡片显示纯色占位"
            checked={draft.media.generateThumbnails}
            agentId="settings.switch.thumbnails"
            onChange={(checked) =>
              onChange({
                ...draft,
                media: { ...draft.media, generateThumbnails: checked },
              })
            }
          />
        </SettingsSection>
      </section>
    );
  }

  return (
    <section>
      <SettingsSection title="自动保存" note="只在工程已有保存位置时生效">
        <SettingsToggle
          label="自动保存工程"
          hint="每次修改后约 2 秒写入当前工程文件"
          checked={draft.storage.autoSave}
          agentId="settings.switch.autosave"
          onChange={(checked) =>
            onChange({
              ...draft,
              storage: { ...draft.storage, autoSave: checked },
            })
          }
        />
      </SettingsSection>
      <SettingsSection title="当前工程" note="工程文件保存在你选择的本地路径">
        <div className="settings-path" data-agent-id="settings.project-path">
          <span>工程文件</span>
          <code>
            {projectPath ??
              (draftId ? "草稿已自动保存在这台电脑上" : "尚未保存到磁盘")}
          </code>
        </div>
        <p className="settings-note">
          素材仍保留在原位置，移动或删除源文件会导致预览与导出失败。
        </p>
      </SettingsSection>
    </section>
  );
}
