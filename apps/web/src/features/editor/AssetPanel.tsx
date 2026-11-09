import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  AudioLines,
  Captions,
  Film,
  FolderOpen,
  Mic,
  Music2,
  Palette,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Type,
  Upload,
  Wand2,
} from "lucide-react";
import type {
  Asset,
  AssetTab,
  CaptionCue,
  ClipAdjust,
  TextStyle,
  TrackClip,
  TransitionSpec,
} from "./data";
import {
  EFFECT_PRESETS,
  FILTER_PRESETS,
  STICKER_PRESETS,
  TEXT_PRESETS,
  TRANSITION_PRESETS,
} from "./core/presets";
import { AdjustPanel } from "./asset/AdjustPanel";
import { CaptionPanel } from "./asset/CaptionPanel";
import { LookGrid } from "./asset/LookGrid";
import { formatBytes, MediaGrid, MediaList } from "./asset/MediaViews";
import { StickerGrid } from "./asset/StickerGrid";
import { TextGrid } from "./asset/TextGrid";
import { TransitionGrid } from "./asset/TransitionGrid";
import { formatMusicDuration, listBuiltinMusic, type BuiltinMusic } from "./core/music";
import { listBuiltinSfx, type BuiltinSfx } from "./core/sfx";
import "./asset/asset.css";

interface AssetPanelProps {
  assets: Asset[];
  captions: CaptionCue[];
  activeTab: AssetTab;
  selectedAssetId: string | null;
  selectedClip: TrackClip | null;
  onChangeTab: (tab: AssetTab) => void;
  onSelectAsset: (assetId: string) => void;
  onInsertAsset: (asset: Asset) => void;
  onImport: () => void;
  onSelectCaption: (cue: CaptionCue) => void;
  onApplyTransition: (transition: TransitionSpec, label: string) => void;
  onApplyFilter: (look: string, label: string) => void;
  onApplyEffect: (look: string, label: string) => void;
  onAdjustClip: (patch: Partial<ClipAdjust>) => void;
  onInsertTextPreset: (text: string, name: string, style?: TextStyle) => void;
  onInsertSticker: (glyph: string, name: string) => void;
  onApplySubtitlePreset: (style: TextStyle, label: string) => void;
  onExtractAudio: () => void;
  onRecordAudio: () => void;
  recording: boolean;
  onAutoCaption: () => void;
  onImportSrt: () => void;
  captionBusy?: boolean;
  onInsertMusic: (track: BuiltinMusic) => void;
  onInsertSfx: (effect: BuiltinSfx) => void;
  onSpeak: (text: string) => void;
  onRenameAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
}

const tabs: Array<{ id: AssetTab; label: string; icon: typeof Film }> = [
  { id: "media", label: "媒体", icon: Film },
  { id: "audio", label: "音频", icon: Music2 },
  { id: "text", label: "文本", icon: Type },
  { id: "stickers", label: "贴纸", icon: Sparkles },
  { id: "effects", label: "特效", icon: Wand2 },
  { id: "transitions", label: "转场", icon: ArrowLeftRight },
  { id: "filters", label: "滤镜", icon: Palette },
  { id: "adjust", label: "调节", icon: SlidersHorizontal },
  { id: "captions", label: "字幕", icon: Captions },
];

export function AssetPanel({
  assets,
  captions,
  activeTab,
  selectedAssetId,
  selectedClip,
  onChangeTab,
  onSelectAsset,
  onInsertAsset,
  onImport,
  onSelectCaption,
  onApplyTransition,
  onApplyFilter,
  onApplyEffect,
  onAdjustClip,
  onInsertTextPreset,
  onInsertSticker,
  onApplySubtitlePreset,
  onExtractAudio,
  onRecordAudio,
  recording,
  onAutoCaption,
  onImportSrt,
  captionBusy,
  onInsertMusic,
  onInsertSfx,
  onSpeak,
  onRenameAsset,
  onDeleteAsset,
}: AssetPanelProps) {
  const activeDefinition = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const [search, setSearch] = useState("");
  const [musicTracks, setMusicTracks] = useState<BuiltinMusic[]>([]);
  const [sfxList, setSfxList] = useState<BuiltinSfx[]>([]);
  const [voiceText, setVoiceText] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listBuiltinMusic().then((tracks) => {
      if (!cancelled) {
        setMusicTracks(tracks);
      }
    });
    void listBuiltinSfx().then((effects) => {
      if (!cancelled) {
        setSfxList(effects);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const visibleAssets =
    activeTab === "audio" ? assets.filter((asset) => asset.kind === "audio") : assets;
  const searchTerm = search.trim().toLowerCase();
  const filteredAssets = searchTerm
    ? visibleAssets.filter((asset) =>
        `${asset.name} ${asset.tag} ${asset.meta}`.toLowerCase().includes(searchTerm),
      )
    : visibleAssets;
  const videoCount = assets.filter((asset) => asset.kind === "video").length;
  const audioCount = assets.filter((asset) => asset.kind === "audio").length;
  const totalBytes = assets.reduce((sum, asset) => sum + (asset.sizeBytes ?? 0), 0);
  const audioBytes = assets
    .filter((asset) => asset.kind === "audio")
    .reduce((sum, asset) => sum + (asset.sizeBytes ?? 0), 0);

  return (
    <aside
      className="asset-panel"
      data-agent-id="panel.assets"
      data-agent-role="panel"
      data-agent-label="素材库"
    >
      <nav className="asset-rail" aria-label="素材功能">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`asset-rail__item${activeTab === tab.id ? " is-active" : ""}`}
              key={tab.id}
              data-agent-id={`tab.${tab.id}`}
              data-agent-role="tab"
              data-agent-label={tab.label}
              onClick={() => onChangeTab(tab.id)}
            >
              <Icon size={15} strokeWidth={1.7} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="asset-content">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">素材库</span>
            <h2>{activeDefinition.label}</h2>
          </div>
          {(activeTab === "media" || activeTab === "audio") && (
            <button
              type="button"
              className="import-chip"
              aria-label="导入素材"
              title="导入素材"
              data-agent-id="button.import"
              data-agent-role="button"
              data-agent-label="导入素材"
              onClick={onImport}
            >
              <Plus size={13} strokeWidth={2} />
              导入
            </button>
          )}
        </div>

        {(activeTab === "media" || activeTab === "audio") && (
          <label className="search-field">
            <Search size={13} strokeWidth={1.8} />
            <input
              type="search"
              placeholder={activeTab === "audio" ? "搜索音频名称、标签、信息" : "搜索素材名称、标签、信息"}
              aria-label="搜索素材"
              data-agent-id="input.asset-search"
              data-agent-role="searchbox"
              data-agent-label="搜索素材"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <kbd>Ctrl F</kbd>
          </label>
        )}

        <div className="asset-scroll">
          {activeTab === "media" && (
            <MediaGrid
              assets={filteredAssets}
              selectedAssetId={selectedAssetId}
              onSelectAsset={onSelectAsset}
              onInsertAsset={onInsertAsset}
              summary={`${assets.length} 个素材`}
              meta={`${videoCount} 视频 · ${audioCount} 音频`}
              emptyHint={searchTerm ? "没有匹配的素材" : undefined}
              onRenameAsset={onRenameAsset}
              onDeleteAsset={onDeleteAsset}
            />
          )}

          {activeTab === "audio" && (
            <>
              <div className="quick-action-row">
                <button
                  type="button"
                  className="quick-action"
                  data-agent-id="button.extract-audio"
                  data-agent-role="button"
                  data-agent-label="提取音频"
                  onClick={onExtractAudio}
                >
                  <AudioLines size={13} strokeWidth={1.8} />
                  提取音频
                </button>
                <button
                  type="button"
                  className={`quick-action${recording ? " is-recording" : ""}`}
                  data-agent-id="button.record-audio"
                  data-agent-role="button"
                  data-agent-label={recording ? "停止录音" : "录音"}
                  onClick={onRecordAudio}
                >
                  <Mic size={13} strokeWidth={1.8} />
                  {recording ? "停止录音" : "录音"}
                </button>
              </div>
              <div className="voiceover-form">
                <input
                  value={voiceText}
                  placeholder="输入配音文本，用系统语音生成…"
                  aria-label="配音文本"
                  data-agent-id="input.voiceover-text"
                  data-agent-role="textbox"
                  data-agent-label="配音文本"
                  onChange={(event) => setVoiceText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && voiceText.trim()) {
                      onSpeak(voiceText.trim());
                      setVoiceText("");
                    }
                  }}
                />
                <button
                  type="button"
                  data-agent-id="button.voiceover"
                  data-agent-role="button"
                  data-agent-label="生成配音"
                  disabled={!voiceText.trim()}
                  onClick={() => {
                    onSpeak(voiceText.trim());
                    setVoiceText("");
                  }}
                >
                  生成配音
                </button>
              </div>
              {musicTracks.length > 0 && (
                <div className="builtin-music">
                  <div className="caption-list__summary">
                    <span>内置免版权音乐</span>
                    <span className="status-chip">{musicTracks.length} 首</span>
                  </div>
                  <div className="builtin-music__list">
                    {musicTracks.map((track) => (
                      <button
                        type="button"
                        key={track.id}
                        className="builtin-music__item"
                        data-agent-id={`music.${track.id}`}
                        data-agent-role="button"
                        data-agent-label={`使用内置音乐 ${track.name}`}
                        onClick={() => onInsertMusic(track)}
                      >
                        <span className="builtin-music__name">{track.name}</span>
                        <span className="builtin-music__meta">
                          {track.bpm} BPM · {formatMusicDuration(track.duration)}
                        </span>
                        <span className="builtin-music__use">使用</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {sfxList.length > 0 && (
                <div className="builtin-music">
                  <div className="caption-list__summary">
                    <span>内置音效</span>
                    <span className="status-chip">{sfxList.length} 个</span>
                  </div>
                  <div className="builtin-music__list">
                    {sfxList.map((effect) => (
                      <button
                        type="button"
                        key={effect.id}
                        className="builtin-music__item"
                        data-agent-id={`sfx.${effect.id}`}
                        data-agent-role="button"
                        data-agent-label={`使用内置音效 ${effect.name}`}
                        onClick={() => onInsertSfx(effect)}
                      >
                        <span className="builtin-music__name">{effect.name}</span>
                        <span className="builtin-music__meta">
                          {effect.category} · {effect.duration.toFixed(1)}s
                        </span>
                        <span className="builtin-music__use">使用</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <MediaList
                assets={filteredAssets}
                selectedAssetId={selectedAssetId}
                onSelectAsset={onSelectAsset}
                onInsertAsset={onInsertAsset}
                summary={`${audioCount} 个音频`}
                meta={audioCount > 0 ? `共 ${formatBytes(audioBytes)}` : "尚未导入音频"}
                emptyHint={
                  searchTerm ? "没有匹配的音频" : "还没有音频。点击右上角「+」导入音乐或音效。"
                }
                onRenameAsset={onRenameAsset}
                onDeleteAsset={onDeleteAsset}
              />
            </>
          )}

          {activeTab === "text" && (
            <TextGrid
              presets={TEXT_PRESETS}
              onInsert={(sample, label, style) => onInsertTextPreset(sample, label, style)}
            />
          )}

          {activeTab === "stickers" && (
            <StickerGrid presets={STICKER_PRESETS} onInsert={onInsertSticker} />
          )}

          {activeTab === "effects" && (
            <LookGrid
              presets={EFFECT_PRESETS}
              selectedLook={selectedClip?.look}
              disabled={!selectedClip}
              hint="先在时间线选择一个片段，再应用特效"
              agentPrefix="effect"
              onApply={onApplyEffect}
            />
          )}

          {activeTab === "transitions" && (
            <TransitionGrid
              presets={TRANSITION_PRESETS}
              disabled={!selectedClip}
              onApply={onApplyTransition}
            />
          )}

          {activeTab === "filters" && (
            <LookGrid
              presets={FILTER_PRESETS}
              selectedLook={selectedClip?.look}
              disabled={!selectedClip}
              hint="先在时间线选择一个片段，再应用滤镜"
              agentPrefix="filter"
              onApply={onApplyFilter}
            />
          )}

          {activeTab === "adjust" && (
            <AdjustPanel selectedClip={selectedClip} onAdjust={onAdjustClip} />
          )}

          {activeTab === "captions" && (
            <CaptionPanel
              captions={captions}
              busy={captionBusy}
              onSelectCaption={onSelectCaption}
              onAutoCaption={onAutoCaption}
              onImportSrt={onImportSrt}
              onApplySubtitlePreset={onApplySubtitlePreset}
            />
          )}
        </div>

        <div className="asset-panel__footer">
          <div className="storage-row">
            <span>
              <FolderOpen size={12} strokeWidth={1.8} />
              本地素材
            </span>
            <span>{totalBytes > 0 ? formatBytes(totalBytes) : "暂无素材"}</span>
          </div>
          <button
            type="button"
            className="import-drop"
            onClick={onImport}
            data-agent-id="button.import-drop"
            data-agent-role="button"
            data-agent-label="拖入文件或点击导入"
          >
            <Upload size={14} strokeWidth={1.8} />
            拖入文件或点击导入
          </button>
        </div>
      </div>
    </aside>
  );
}
