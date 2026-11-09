import type { ReactNode } from "react";
import { Clapperboard, Minus, ScrollText, Settings, Square, X } from "lucide-react";
import { isTauriRuntime } from "../core/desktop";

export type HomeSection = "drafts" | "scripts";

interface HomeChromeProps {
  active: HomeSection;
  screenId: string;
  onSelectDrafts: () => void;
  onSelectScripts: () => void;
  onOpenSettings: () => void;
  children: ReactNode;
}

async function windowAction(action: "minimize" | "maximize" | "close") {
  if (!isTauriRuntime) {
    return;
  }
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();
  if (action === "minimize") {
    await appWindow.minimize();
  } else if (action === "close") {
    await appWindow.close();
  } else {
    await appWindow.toggleMaximize();
  }
}

export function HomeChrome({
  active,
  screenId,
  onSelectDrafts,
  onSelectScripts,
  onOpenSettings,
  children,
}: HomeChromeProps) {
  return (
    <div className="home-root" data-agent-id={screenId} data-agent-role="page">
      <header
        className="home-titlebar"
        data-tauri-drag-region
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) {
            return;
          }
          void windowAction("maximize");
        }}
      >
        <div className="home-titlebar__brand">
          <span className="home-mark">XC</span>
          <span>ximo-Cut</span>
        </div>
        <span className="home-titlebar__status">
          <i />
          本地草稿 · 自动保存
        </span>
        <div className="home-window-controls">
          <button type="button" aria-label="最小化" onClick={() => void windowAction("minimize")}>
            <Minus size={13} strokeWidth={1.6} />
          </button>
          <button type="button" aria-label="最大化" onClick={() => void windowAction("maximize")}>
            <Square size={11} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            className="is-close"
            aria-label="关闭"
            onClick={() => void windowAction("close")}
          >
            <X size={13} strokeWidth={1.6} />
          </button>
        </div>
      </header>

      <div className="home-shell">
        <aside className="home-rail">
          <button
            type="button"
            className={`home-rail__item${active === "drafts" ? " is-active" : ""}`}
            aria-label="我的草稿"
            data-agent-id="home.nav.drafts"
            data-agent-role="tab"
            onClick={onSelectDrafts}
          >
            <Clapperboard size={17} strokeWidth={1.7} />
            <span>草稿</span>
          </button>
          <button
            type="button"
            className={`home-rail__item${active === "scripts" ? " is-active" : ""}`}
            aria-label="视频脚本"
            data-agent-id="home.nav.scripts"
            data-agent-role="tab"
            onClick={onSelectScripts}
          >
            <ScrollText size={17} strokeWidth={1.7} />
            <span>脚本</span>
          </button>
          <div className="home-rail__spacer" />
          <button
            type="button"
            className="home-rail__item"
            aria-label="设置"
            data-agent-id="home.nav.settings"
            data-agent-role="button"
            onClick={onOpenSettings}
          >
            <Settings size={17} strokeWidth={1.7} />
            <span>设置</span>
          </button>
        </aside>

        <main className="home-main">{children}</main>
      </div>
    </div>
  );
}
