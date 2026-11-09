import { useState } from "react";
import { AudioLines, Film, MoreHorizontal } from "lucide-react";
import type { Asset } from "../data";

interface AssetMenuState {
  asset: Asset;
  x: number;
  y: number;
}

export function MediaGrid({
  assets,
  selectedAssetId,
  onSelectAsset,
  onInsertAsset,
  summary,
  meta,
  emptyHint,
  onRenameAsset,
  onDeleteAsset,
}: {
  assets: Asset[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
  onInsertAsset: (asset: Asset) => void;
  summary: string;
  meta: string;
  emptyHint?: string;
  onRenameAsset?: (asset: Asset) => void;
  onDeleteAsset?: (asset: Asset) => void;
}) {
  const [menu, setMenu] = useState<AssetMenuState | null>(null);
  return (
    <>
      <div className="asset-summary">
        <span>{summary}</span>
        <span>{meta}</span>
      </div>
      {assets.length === 0 && (
        <p className="asset-empty">
          {emptyHint ?? "还没有导入素材。点击右上角「导入」，或把视频、音频、图片拖进窗口。"}
        </p>
      )}
      <div className="asset-grid">
        {assets.map((asset) => (
          <button
            type="button"
            className={`asset-tile${selectedAssetId === asset.id ? " is-selected" : ""}`}
            key={asset.id}
            data-agent-id={`asset.${asset.id}`}
            data-agent-role="asset"
            data-agent-label={asset.name}
            data-agent-actions="click"
            onClick={() => onSelectAsset(asset.id)}
            onDoubleClick={() => onInsertAsset(asset)}
            onContextMenu={(event) => {
              event.preventDefault();
              onSelectAsset(asset.id);
              setMenu({ asset, x: event.clientX, y: event.clientY });
            }}
          >
            <span
              className={`asset-tile__thumb asset-thumb--${asset.tone}`}
              style={
                asset.thumbnail
                  ? {
                      backgroundImage: `url(${asset.thumbnail})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              {asset.kind === "audio" && <WaveformBars compact />}
              <span className="asset-thumb__duration">{asset.duration}</span>
            </span>
            <span className="asset-tile__name">{asset.name}</span>
            <span className="asset-tile__meta">{asset.meta}</span>
          </button>
        ))}
      </div>
      {menu && (
        <AssetMenu
          menu={menu}
          onClose={() => setMenu(null)}
          onRename={onRenameAsset}
          onDelete={onDeleteAsset}
        />
      )}
    </>
  );
}

export function MediaList({
  assets,
  selectedAssetId,
  onSelectAsset,
  onInsertAsset,
  summary,
  meta,
  emptyHint,
  onRenameAsset,
  onDeleteAsset,
}: {
  assets: Asset[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
  onInsertAsset: (asset: Asset) => void;
  summary: string;
  meta: string;
  emptyHint?: string;
  onRenameAsset?: (asset: Asset) => void;
  onDeleteAsset?: (asset: Asset) => void;
}) {
  const [menu, setMenu] = useState<AssetMenuState | null>(null);
  return (
    <>
      <div className="asset-summary">
        <span>{summary}</span>
        <span>{meta}</span>
      </div>
      <div className="asset-list">
        {assets.length === 0 && (
          <p className="asset-empty">
            {emptyHint ?? "还没有导入素材。点击下方「拖入文件或点击导入」，或把视频、音频拖进窗口。"}
          </p>
        )}
        {assets.map((asset) => (
          <button
            type="button"
            className={`asset-card${selectedAssetId === asset.id ? " is-selected" : ""}`}
            key={asset.id}
            data-agent-id={`asset.${asset.id}`}
            data-agent-role="asset"
            data-agent-label={asset.name}
            data-agent-actions="click"
            onClick={() => onSelectAsset(asset.id)}
            onDoubleClick={() => onInsertAsset(asset)}
            onContextMenu={(event) => {
              event.preventDefault();
              onSelectAsset(asset.id);
              setMenu({ asset, x: event.clientX, y: event.clientY });
            }}
          >
            <span
              className={`asset-thumb asset-thumb--${asset.tone}`}
              style={
                asset.thumbnail
                  ? {
                      backgroundImage: `url(${asset.thumbnail})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              {asset.kind === "audio" ? (
                <WaveformBars compact />
              ) : (
                <span className="asset-thumb__frame" />
              )}
              <span className="asset-thumb__duration">{asset.duration}</span>
            </span>
            <span className="asset-card__body">
              <span className="asset-card__name">{asset.name}</span>
              <span className="asset-card__meta">{asset.meta}</span>
              <span className="asset-card__tag">
                {asset.kind === "audio" ? (
                  <AudioLines size={10} strokeWidth={2} />
                ) : (
                  <Film size={10} strokeWidth={2} />
                )}
                {asset.tag}
              </span>
            </span>
            {typeof asset.quality === "number" && (
              <span className={`quality-badge${asset.quality >= 90 ? " is-high" : ""}`}>
                {asset.quality}
              </span>
            )}
            <span
              className="asset-card__more"
              role="button"
              aria-label={`管理素材 ${asset.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectAsset(asset.id);
                const rect = event.currentTarget.getBoundingClientRect();
                setMenu({ asset, x: rect.left, y: rect.bottom + 4 });
              }}
            >
              <MoreHorizontal size={13} strokeWidth={1.8} />
            </span>
          </button>
        ))}
      </div>
      {menu && (
        <AssetMenu
          menu={menu}
          onClose={() => setMenu(null)}
          onRename={onRenameAsset}
          onDelete={onDeleteAsset}
        />
      )}
    </>
  );
}

function AssetMenu({
  menu,
  onClose,
  onRename,
  onDelete,
}: {
  menu: AssetMenuState;
  onClose: () => void;
  onRename?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
}) {
  const left = Math.min(menu.x, Math.max(0, window.innerWidth - 150));
  const top = Math.min(menu.y, Math.max(0, window.innerHeight - 86));
  return (
    <div className="asset-menu" style={{ left, top }} onMouseLeave={onClose}>
      <button
        type="button"
        data-agent-id={`asset.rename.${menu.asset.id}`}
        data-agent-role="button"
        data-agent-label={`重命名 ${menu.asset.name}`}
        onClick={() => {
          onRename?.(menu.asset);
          onClose();
        }}
      >
        重命名
      </button>
      <button
        type="button"
        className="is-danger"
        data-agent-id={`asset.delete.${menu.asset.id}`}
        data-agent-role="button"
        data-agent-label={`删除 ${menu.asset.name}`}
        onClick={() => {
          onDelete?.(menu.asset);
          onClose();
        }}
      >
        删除素材
      </button>
    </div>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0 MB";
  }
  const megabytes = bytes / 1024 / 1024;
  if (megabytes < 1024) {
    return `${megabytes.toFixed(1)} MB`;
  }
  return `${(megabytes / 1024).toFixed(2)} GB`;
}

export function WaveformBars({ compact = false }: { compact?: boolean }) {
  const bars = [
    22, 44, 35, 68, 52, 84, 61, 38, 76, 47, 91, 58, 33, 70, 49, 82, 41, 62,
    28, 73, 55, 88, 46, 67, 31, 79, 53, 86, 44, 60, 36, 72, 50, 81, 43, 65,
  ];

  return (
    <span className={`waveform${compact ? " waveform--compact" : ""}`} aria-hidden="true">
      {bars.map((height, index) => (
        <i key={`${height}-${index}`} style={{ height: `${height}%` }} />
      ))}
    </span>
  );
}
