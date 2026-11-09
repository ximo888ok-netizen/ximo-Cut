import { useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Film, FolderOpen, Plus, Search } from "lucide-react";
import type { DraftMeta } from "./data";
import {
  deleteDraft,
  duplicateDraft,
  formatDraftDuration,
  listDrafts,
  renameDraft,
} from "./core/drafts";
import { isTauriRuntime, openProjectDialog } from "./core/desktop";
import { DraftCard } from "./DraftCard";
import { HomeChrome } from "./home/HomeChrome";
import "./home.css";

interface HomePageProps {
  onCreateDraft: () => void;
  onOpenDraft: (id: string) => void;
  onImportProject: (contents: string) => Promise<void>;
  onOpenSettings: () => void;
  onOpenScripts: () => void;
  onOpenReplica: () => void;
  onToast: (message: string) => void;
}

export function HomePage({
  onCreateDraft,
  onOpenDraft,
  onImportProject,
  onOpenSettings,
  onOpenScripts,
  onOpenReplica,
  onToast,
}: HomePageProps) {
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const next = await listDrafts();
    setDrafts(next);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        onCreateDraft();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCreateDraft]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return keyword
      ? drafts.filter((draft) => draft.name.toLowerCase().includes(keyword))
      : drafts;
  }, [drafts, query]);

  const totalDuration = drafts.reduce((sum, draft) => sum + draft.duration, 0);

  const importProject = async () => {
    if (importing) {
      return;
    }
    if (!isTauriRuntime) {
      projectInputRef.current?.click();
      return;
    }
    try {
      setImporting(true);
      const file = await openProjectDialog();
      if (file) {
        await onImportProject(file.contents);
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : "导入工程失败");
    } finally {
      setImporting(false);
    }
  };

  return (
    <HomeChrome
      active="drafts"
      screenId="screen.home"
      onSelectDrafts={() => undefined}
      onSelectScripts={onOpenScripts}
      onOpenSettings={onOpenSettings}
    >
      <div className="home-hero">
        <div className="home-hero__copy">
          <span className="home-eyebrow">XIMO CUT · LOCAL WORKSPACE</span>
          <h1>我的草稿</h1>
          <p>
            {loading
              ? "正在读取本地草稿…"
              : `共 ${drafts.length} 个草稿 · 总时长 ${formatDraftDuration(totalDuration)}，所有改动都会自动保存在这台电脑上。`}
          </p>
        </div>
        <div className="home-hero__actions">
          <button
            type="button"
            className="home-button home-button--ghost"
            data-agent-id="home.button.replica"
            data-agent-role="button"
            data-agent-label="复刻参考片"
            onClick={onOpenReplica}
          >
            <Film size={14} strokeWidth={1.8} />
            复刻参考片
          </button>
          <button
            type="button"
            className="home-button home-button--ghost"
            data-agent-id="home.button.import-project"
            data-agent-role="button"
            disabled={importing}
            onClick={() => void importProject()}
          >
            <FolderOpen size={14} strokeWidth={1.8} />
            {importing ? "正在导入…" : "导入工程"}
          </button>
          <button
            type="button"
            className="home-button home-button--primary"
            data-agent-id="home.button.create-draft"
            data-agent-role="button"
            onClick={onCreateDraft}
          >
            <Plus size={15} strokeWidth={2} />
            新建草稿
          </button>
        </div>
      </div>

      <div className="home-toolbar">
        <label className="home-search">
          <Search size={14} strokeWidth={1.8} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="搜索草稿名称"
            aria-label="搜索草稿"
            data-agent-id="home.input.search"
            data-agent-role="searchbox"
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>Ctrl F</kbd>
        </label>
        <button
          type="button"
          className="home-toolbar__link"
          data-agent-id="home.button.scripts"
          data-agent-role="button"
          data-agent-label="视频脚本"
          onClick={onOpenScripts}
        >
          <Film size={12} strokeWidth={1.9} />
          视频脚本 · 复刻
        </button>
      </div>

      {loading ? (
        <div className="home-grid">
          {[0, 1, 2].map((item) => (
            <div className="draft-card draft-card--skeleton" key={item}>
              <div className="draft-card__cover" />
              <div className="draft-card__body">
                <span />
                <span />
              </div>
            </div>
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="home-empty">
          <div className="home-empty__frame">
            <Clapperboard size={30} strokeWidth={1.2} />
            <span>NO DRAFTS YET</span>
          </div>
          <h2>从一段画面开始</h2>
          <p>新建草稿，把视频、音频和图片拖进时间线。也可以直接导入已有的 .ocproj 工程。</p>
          <div className="home-empty__actions">
            <button
              type="button"
              className="home-button home-button--primary"
              onClick={onCreateDraft}
            >
              <Plus size={15} strokeWidth={2} />
              新建草稿
            </button>
            <button type="button" className="home-button home-button--ghost" onClick={onOpenScripts}>
              管理脚本
            </button>
          </div>
        </div>
      ) : (
        <div className="home-grid">
          {filtered.map((draft, index) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              index={index}
              onOpen={() => onOpenDraft(draft.id)}
              onRename={async (name) => {
                const result = await renameDraft(draft.id, name);
                if (result) {
                  await refresh();
                  return true;
                }
                return false;
              }}
              onDuplicate={async () => {
                const result = await duplicateDraft(draft.id);
                if (result) {
                  await refresh();
                  onToast(`已复制「${result.name}」`);
                  return true;
                }
                return false;
              }}
              onDelete={async () => {
                await deleteDraft(draft.id);
                await refresh();
                onToast(`已删除「${draft.name}」`);
                return true;
              }}
              onError={onToast}
            />
          ))}
          {filtered.length === 0 && (
            <div className="home-no-result">没有匹配「{query.trim()}」的草稿</div>
          )}
          {!query.trim() && (
            <button
              type="button"
              className="draft-card draft-card--import"
              data-agent-id="home.tile.import-project"
              data-agent-role="button"
              onClick={() => void importProject()}
            >
              <span className="draft-import__icon">
                <FolderOpen size={20} strokeWidth={1.5} />
              </span>
              <strong>导入 .ocproj 工程</strong>
              <em>从已有工程继续创作</em>
            </button>
          )}
        </div>
      )}

      <input
        ref={projectInputRef}
        type="file"
        accept=".json,.ocproj,application/json"
        className="visually-hidden"
        aria-label="导入工程文件"
        data-agent-id="home.input.import-project"
        data-agent-role="file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void file.text().then((contents) => onImportProject(contents));
          }
          event.target.value = "";
        }}
      />
    </HomeChrome>
  );
}
