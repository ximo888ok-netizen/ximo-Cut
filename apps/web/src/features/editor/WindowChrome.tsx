import { useEffect, useRef, useState } from "react";
import {
  Cloud,
  Download,
  House,
  Minus,
  Redo2,
  Search,
  Settings,
  Square,
  Undo2,
  X,
} from "lucide-react";

interface WindowChromeProps {
  projectName: string;
  maximized: boolean;
  dirty: boolean;
  saveState: string;
  aiOnline: boolean;
  aiKeySource: "server" | "settings" | null;
  canExport: boolean;
  canUndo: boolean;
  canRedo: boolean;
  activeTool: "select" | "blade" | "ripple";
  onToggleMaximize: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onAction: (message: string) => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onChangeTool: (tool: "select" | "blade" | "ripple") => void;
  onSplitSelected: () => void;
  onRippleDeleteSelected: () => void;
  onCutSelected: () => void;
  onCopySelected: () => void;
  onPasteClip: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onAddTransitionSelected: () => void;
  onAutoCut: () => void;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  onBackHome?: () => void;
}

const menus: Record<string, string[]> = {
  文件: ["新建项目", "打开项目…", "保存", "另存为…", "导出视频", "设置…"],
  编辑: ["撤销", "重做", "剪切", "复制", "粘贴"],
  剪辑: ["分割片段", "波纹删除", "添加转场", "自动精剪"],
  视图: ["放大时间线", "缩小时间线", "适应时间线"],
  帮助: ["关于 ximo-Cut"],
};

const menuShortcuts: Record<string, string> = {
  新建项目: "Ctrl N",
  "打开项目…": "Ctrl O",
  保存: "Ctrl S",
  "另存为…": "Ctrl Shift S",
  导出视频: "Ctrl E",
  "设置…": "Ctrl ,",
  撤销: "Ctrl Z",
  重做: "Ctrl Shift Z",
  剪切: "Ctrl X",
  复制: "Ctrl C",
  粘贴: "Ctrl V",
  分割片段: "Ctrl B",
  波纹删除: "Shift Del",
  放大时间线: "=",
  缩小时间线: "-",
};

export function WindowChrome({
  projectName,
  maximized,
  dirty,
  saveState,
  aiOnline,
  aiKeySource,
  canExport,
  canUndo,
  canRedo,
  activeTool,
  onToggleMaximize,
  onMinimize,
  onClose,
  onAction,
  onOpenCommandPalette,
  onOpenSettings,
  onExport,
  onUndo,
  onRedo,
  onChangeTool,
  onSplitSelected,
  onRippleDeleteSelected,
  onCutSelected,
  onCopySelected,
  onPasteClip,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onAddTransitionSelected,
  onAutoCut,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onSaveProjectAs,
  onBackHome,
}: WindowChromeProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        menuAreaRef.current &&
        !menuAreaRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [openMenu]);

  const chooseMenuItem = (menu: string, item: string) => {
    setOpenMenu(null);
    switch (item) {
      case "新建项目":
        onNewProject();
        return;
      case "打开项目…":
        onOpenProject();
        return;
      case "保存":
        onSaveProject();
        return;
      case "另存为…":
        onSaveProjectAs();
        return;
      case "导出视频":
        onExport();
        return;
      case "设置…":
        onOpenSettings();
        return;
      case "撤销":
        onUndo();
        return;
      case "重做":
        onRedo();
        return;
      case "剪切":
        onCutSelected();
        return;
      case "复制":
        onCopySelected();
        return;
      case "粘贴":
        onPasteClip();
        return;
      case "分割片段":
        onSplitSelected();
        return;
      case "波纹删除":
        onRippleDeleteSelected();
        return;
      case "放大时间线":
        onZoomIn();
        return;
      case "缩小时间线":
        onZoomOut();
        return;
      case "适应时间线":
        onZoomFit();
        return;
      case "关于 ximo-Cut":
        onAction("ximo-Cut 0.1.0 · 本地优先的 AI 剪辑工作台");
        return;
      case "添加转场":
        onAddTransitionSelected();
        return;
      case "自动精剪":
        onAutoCut();
        return;
      default:
        onAction(`${menu} / ${item}：功能尚未实现`);
    }
  };

  return (
    <>
      <header
        className="titlebar"
        data-agent-id="window.titlebar"
        data-agent-role="window"
        {...(!maximized ? { "data-tauri-drag-region": true } : {})}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) {
            return;
          }
          onToggleMaximize();
        }}
      >
        <div className="titlebar__identity">
          {onBackHome && (
            <button
              type="button"
              className="titlebar__home"
              aria-label="返回首页"
              title="返回首页"
              data-agent-id="button.home"
              data-agent-role="button"
              data-agent-label="返回首页"
              onClick={onBackHome}
            >
              <House size={13} strokeWidth={1.8} />
            </button>
          )}
          <LogoMark />
          <span className="titlebar__app">ximo-Cut</span>
          <span className="titlebar__divider" />
          <span className="titlebar__project">{projectName}</span>
          <span
            className={`save-state${dirty ? " is-dirty" : ""}${saveState === "新工程" ? " is-new" : ""}`}
            title={dirty ? "有未保存的修改 · Ctrl+S 保存" : undefined}
          >
            <Cloud size={12} strokeWidth={1.8} />
            {saveState}
          </span>
        </div>

        <button
          type="button"
          className="command-search"
          data-agent-id="button.command-search"
          data-agent-role="button"
          data-agent-label="搜索命令"
          title="命令面板 Ctrl+K"
          onClick={onOpenCommandPalette}
        >
          <Search size={14} strokeWidth={1.8} />
          <span>搜索命令或操作</span>
          <kbd>
            Ctrl K
          </kbd>
        </button>

        <div className="titlebar__right">
          <button
            type="button"
            className="titlebar__settings"
            aria-label="设置"
            title="设置 Ctrl+,"
            data-agent-id="button.settings"
            data-agent-role="button"
            data-agent-label="设置"
            onClick={onOpenSettings}
          >
            <Settings size={14} strokeWidth={1.8} />
          </button>
          <span
            className={`ai-status${aiOnline ? "" : " is-offline"}`}
            title={
              !aiOnline
                ? "千问未连接：请在设置 → 模型与服务中检查 API Key 和接口地址"
                : aiKeySource === "settings"
                  ? "使用设置中填写的 API Key"
                  : "使用服务端 .dev.vars 中的 API Key"
            }
          >
            <span className="ai-status__dot" />
            {!aiOnline ? "AI 未连接" : aiKeySource === "settings" ? "AI 已就绪" : "AI 已连接"}
          </span>
          <div className="window-controls">
            <button
              type="button"
              className="window-control"
              aria-label="最小化窗口"
              title="最小化"
              data-agent-id="button.window.minimize"
              data-agent-role="button"
              data-agent-label="最小化窗口"
              onClick={onMinimize}
            >
              <Minus size={15} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className="window-control"
              aria-label={maximized ? "还原窗口" : "最大化窗口"}
              title={maximized ? "还原" : "最大化"}
              data-agent-id="button.window.maximize"
              data-agent-role="button"
              data-agent-label={maximized ? "还原窗口" : "最大化窗口"}
              onClick={onToggleMaximize}
            >
              <Square size={12} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className="window-control window-control--close"
              aria-label="关闭窗口"
              title="关闭"
              data-agent-id="button.window.close"
              data-agent-role="button"
              data-agent-label="关闭窗口"
              onClick={onClose}
            >
              <X size={15} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <div className="menubar" ref={menuAreaRef}>
        <nav className="menubar__menus" aria-label="应用菜单">
          {Object.keys(menus).map((menu) => (
            <div className="menu" key={menu}>
              <button
                type="button"
                className={`menu__trigger${openMenu === menu ? " is-open" : ""}`}
                data-agent-id={`menu.${menu}`}
                data-agent-role="menu"
                data-agent-label={menu}
                data-agent-actions="click"
                onClick={() => setOpenMenu(openMenu === menu ? null : menu)}
              >
                {menu}
              </button>
              {openMenu === menu && (
                <div className="menu__popover">
                  {menus[menu].map((item) => (
                    <button
                      type="button"
                      className="menu__item"
                      key={item}
                      data-agent-id={`menu.item.${menu}.${item}`}
                      data-agent-role="menuitem"
                      data-agent-label={item}
                      onClick={() => chooseMenuItem(menu, item)}
                    >
                      <span>{item}</span>
                      {menuShortcuts[item] && (
                        <span className="menu__shortcut">{menuShortcuts[item]}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="menubar__tools">
          <div className="tool-group">
            <button type="button" className="icon-button" aria-label="撤销" title="撤销 Ctrl Z" data-agent-id="button.undo" data-agent-role="button" data-agent-label="撤销" disabled={!canUndo} onClick={onUndo}>
              <Undo2 size={15} strokeWidth={1.7} />
            </button>
            <button type="button" className="icon-button" aria-label="重做" title="重做 Ctrl Shift Z" data-agent-id="button.redo" data-agent-role="button" data-agent-label="重做" disabled={!canRedo} onClick={onRedo}>
              <Redo2 size={15} strokeWidth={1.7} />
            </button>
          </div>
          <span className="tool-divider" />
          <div className="tool-group">
            <button
              type="button"
              className={`icon-button${activeTool === "select" ? " is-active" : ""}`}
              aria-label="选择工具"
              title="选择工具 V"
              data-agent-id="button.tool.select"
              data-agent-role="button"
              data-agent-label="选择工具"
              onClick={() => onChangeTool("select")}
            >
              <CursorIcon />
            </button>
            <button
              type="button"
              className={`icon-button${activeTool === "blade" ? " is-active" : ""}`}
              aria-label="刀片工具"
              title="刀片工具 B"
              data-agent-id="button.tool.blade"
              data-agent-role="button"
              data-agent-label="刀片工具"
              onClick={() => onChangeTool("blade")}
            >
              <BladeIcon />
            </button>
            <button
              type="button"
              className={`icon-button${activeTool === "ripple" ? " is-active" : ""}`}
              aria-label="波纹删除"
              title="波纹删除"
              data-agent-id="button.tool.ripple"
              data-agent-role="button"
              data-agent-label="波纹删除"
              onClick={() => onChangeTool("ripple")}
            >
              <RippleIcon />
            </button>
          </div>
          <span className="tool-divider" />
          <button
            type="button"
            className="menubar__autocut"
            data-agent-id="button.auto-cut"
            data-agent-role="button"
            data-agent-label="自动精剪"
            onClick={onAutoCut}
          >
            <SparkIcon />
            自动精剪
          </button>
          <button type="button" className="export-button" data-agent-id="button.export" data-agent-role="button" data-agent-label="导出" onClick={onExport} disabled={!canExport} title={canExport ? "导出视频 Ctrl+E" : "时间线为空，先添加片段"}>
            <Download size={14} strokeWidth={2} />
            导出
          </button>
        </div>
      </div>
    </>
  );
}

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 28 28" fill="none">
        <rect x="1" y="1" width="26" height="26" rx="7" fill="currentColor" />
        <path
          d="M8.6 18.8 18.8 8.6M8.6 9.4h6.2M13.2 18.8h6.2"
          stroke="#12151a"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <path
        d="M3.2 2.6 12 7.4l-3.8 1.1-1.8 3.7-3.2-9.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BladeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <circle cx="4.2" cy="11.9" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4.2" cy="4.1" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="m5.9 5.7 7.7 7.7M5.9 10.3 13.6 2.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function RippleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <path d="M2.3 4.6h5.1M2.3 8h3.4M2.3 11.4h5.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="m10.2 3.7 4.1 4.2-4.1 4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M8 1.6 9.3 6l4.4 1.3-4.4 1.3L8 13l-1.3-4.4L2.3 7.3 6.7 6 8 1.6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M12.5 11.2v2.4M11.3 12.4h2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
