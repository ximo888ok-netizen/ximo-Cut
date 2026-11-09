import { useEffect, useState } from "react";
import { Cpu, Film, HardDrive, Monitor, RotateCcw, X } from "lucide-react";
import { DEFAULT_SETTINGS, type EditorSettings } from "./core/settings";
import { checkQwenStatus } from "./core/qwenClient";
import { SettingsSections } from "./settings/SettingsSections";
import type { SettingsTab, SettingsTestState } from "./settings/types";

interface SettingsDialogProps {
  open: boolean;
  settings: EditorSettings;
  draftId: string | null;
  projectPath: string | null;
  onClose: () => void;
  onSave: (settings: EditorSettings) => void;
}

const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Cpu }> = [
  { id: "ai", label: "模型与服务", icon: Cpu },
  { id: "timeline", label: "剪辑与导出", icon: Film },
  { id: "interface", label: "界面", icon: Monitor },
  { id: "storage", label: "存储", icon: HardDrive },
];

export function SettingsDialog({
  open,
  settings,
  draftId,
  projectPath,
  onClose,
  onSave,
}: SettingsDialogProps) {
  const [draft, setDraft] = useState<EditorSettings>(settings);
  const [tab, setTab] = useState<SettingsTab>("ai");
  const [test, setTest] = useState<SettingsTestState>({ status: "idle" });

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraft(settings);
    setTab("ai");
    setTest({ status: "idle" });
  }, [open, settings]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const runTest = async () => {
    setTest({ status: "loading" });
    if (!draft.ai.apiKey.trim()) {
      setTest({ status: "warn", message: "请先填写千问 API Key" });
      return;
    }
    const result = await checkQwenStatus(draft.ai.baseUrl, draft.ai.apiKey);
    if (!result.reachable) {
      setTest({
        status: "error",
        message: `无法连接 ${draft.ai.baseUrl} · ${result.error ?? "请检查网络"}`,
      });
      return;
    }
    if (!result.configured) {
      setTest({
        status: "error",
        message: result.error ?? "API Key 不可用",
      });
      return;
    }
    setTest({
      status: "ok",
      message: `连接成功 · ${draft.ai.model} 可用`,
    });
  };

  return (
    <div className="palette-backdrop settings-backdrop" onMouseDown={onClose}>
      <div
        className="settings-panel"
        role="dialog"
        aria-label="设置"
        data-agent-id="dialog.settings"
        data-agent-role="dialog"
        data-agent-label="设置"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="settings-header">
          <div>
            <span className="panel-kicker">偏好设置</span>
            <h2>设置</h2>
          </div>
          <button
            type="button"
            className="settings-close"
            aria-label="关闭设置"
            data-agent-id="settings.close"
            data-agent-role="button"
            data-agent-label="关闭设置"
            onClick={onClose}
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        </header>

        <div className="settings-body">
          <nav className="settings-nav" aria-label="设置分类">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`settings-nav__item${tab === item.id ? " is-active" : ""}`}
                  data-agent-id={`settings.tab.${item.id}`}
                  data-agent-role="tab"
                  data-agent-label={item.label}
                  onClick={() => setTab(item.id)}
                >
                  <Icon size={14} strokeWidth={1.7} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="settings-content">
            <SettingsSections
              tab={tab}
              draft={draft}
              draftId={draftId}
              projectPath={projectPath}
              test={test}
              onTest={() => void runTest()}
              onChange={setDraft}
            />
          </div>
        </div>

        <footer className="settings-footer">
          <button
            type="button"
            className="settings-button settings-button--ghost"
            data-agent-id="settings.button.reset"
            data-agent-role="button"
            data-agent-label="恢复默认设置"
            onClick={() => {
              setDraft(DEFAULT_SETTINGS);
              setTest({ status: "idle" });
            }}
          >
            <RotateCcw size={13} />
            恢复默认
          </button>
          <div className="settings-footer__right">
            <button
              type="button"
              className="settings-button"
              data-agent-id="settings.button.cancel"
              data-agent-role="button"
              data-agent-label="取消"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="button"
              className="settings-button settings-button--primary"
              data-agent-id="settings.button.save"
              data-agent-role="button"
              data-agent-label="保存设置"
              onClick={() => onSave(draft)}
            >
              保存设置
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
