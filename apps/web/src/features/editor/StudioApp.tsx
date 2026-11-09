import { useCallback, useEffect, useRef, useState } from "react";
import { EditorApp } from "./EditorApp";
import { HomePage } from "./HomePage";
import { ScriptLibraryPage } from "./ScriptLibraryPage";
import { SettingsDialog } from "./SettingsDialog";
import {
  buildDraftContents,
  buildDraftMeta,
  newDraftId,
  saveDraft,
} from "./core/drafts";
import { parseProjectFile } from "./core/desktop";
import type { ScriptDoc } from "./core/scripts";
import { loadSettings, saveSettings, type EditorSettings } from "./core/settings";
import "./editor.css";
import "./home.css";

type StudioView = "home" | "scripts" | "editor";

export function StudioApp() {
  const [view, setView] = useState<StudioView>("home");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [openScriptId, setOpenScriptId] = useState<string | null>(null);
  const [replicaRequest, setReplicaRequest] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
    },
    [],
  );

  const openEditor = (id: string) => {
    setDraftId(id);
    setView("editor");
  };

  const createDraft = () => {
    setOpenScriptId(null);
    openEditor(newDraftId());
  };

  const useScriptInNewDraft = (doc: ScriptDoc) => {
    setOpenScriptId(doc.id);
    openEditor(newDraftId());
    showToast(`正在用脚本「${doc.title}」新建草稿，导入素材后即可套用`);
  };

  const importProject = async (contents: string) => {
    try {
      const file = parseProjectFile(contents);
      const id = newDraftId();
      const name = file.project.name?.trim() || "导入的工程";
      const meta = buildDraftMeta({
        id,
        name,
        createdAt: new Date().toISOString(),
        project: file.project,
        assets: file.assets,
      });
      const payload = buildDraftContents({
        meta,
        project: file.project,
        assets: file.assets,
        renderSettings: file.render_settings,
        planShots: file.plan_shots,
        audioAnalyses: file.audio_analyses,
      });
      await saveDraft(meta, payload);
      showToast(`已导入工程「${name}」`);
      setOpenScriptId(null);
      openEditor(id);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "导入工程失败");
    }
  };

  return (
    <div className="studio-root">
      {view === "home" && (
        <HomePage
          onCreateDraft={createDraft}
          onOpenDraft={(id) => {
            setOpenScriptId(null);
            openEditor(id);
          }}
          onImportProject={importProject}
          onOpenSettings={() => {
            setSettings(loadSettings());
            setSettingsOpen(true);
          }}
          onOpenScripts={() => setView("scripts")}
          onOpenReplica={() => {
            setReplicaRequest(true);
            setView("scripts");
          }}
          onToast={showToast}
        />
      )}

      {view === "scripts" && (
        <ScriptLibraryPage
          onBackHome={() => setView("home")}
          onOpenSettings={() => {
            setSettings(loadSettings());
            setSettingsOpen(true);
          }}
          onUseScript={useScriptInNewDraft}
          onToast={showToast}
          autoReplica={replicaRequest}
          onConsumeAutoReplica={() => setReplicaRequest(false)}
        />
      )}

      {view === "editor" && draftId && (
        <EditorApp
          key={draftId}
          draftId={draftId}
          initialScriptId={openScriptId}
          onBackHome={() => {
            setView("home");
            setDraftId(null);
            setOpenScriptId(null);
          }}
        />
      )}

      {view !== "editor" && (
        <SettingsDialog
          open={settingsOpen}
          settings={settings}
          draftId={draftId}
          projectPath={null}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => {
            setSettings(next);
            saveSettings(next);
            showToast("设置已保存");
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span className="toast__dot" />
          {toast}
        </div>
      )}
    </div>
  );
}
