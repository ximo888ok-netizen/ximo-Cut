const BLOCKED_PREFIXES: Array<{ prefix: string; reason: string }> = [
  { prefix: "button.window.", reason: "窗口控制需要你手动操作" },
  { prefix: "button.settings", reason: "设置面板需要你手动操作" },
  { prefix: "settings.", reason: "设置项需要你手动修改" },
  { prefix: "button.agent-", reason: "AI 工作台本身由你控制" },
  { prefix: "button.home", reason: "返回首页需要你手动操作" },
  { prefix: "draft.", reason: "草稿管理需要你手动操作" },
  { prefix: "home.", reason: "首页操作需要你手动完成" },
  { prefix: "button.import", reason: "导入文件需要你选择本地文件" },
  { prefix: "input.import-srt", reason: "导入字幕需要你选择本地文件" },
  { prefix: "button.record-audio", reason: "录音需要你手动开始和结束" },
  { prefix: "button.export", reason: "导出请使用 AI 导出工具或手动点击" },
  { prefix: "button.quickcut", reason: "一键快剪请使用 AI 快剪工具" },
  { prefix: "button.auto-cut", reason: "一键快剪请使用 AI 快剪工具" },
];

export function blockedAgentTarget(id: string): string | null {
  const matched = BLOCKED_PREFIXES.find((item) => id.startsWith(item.prefix));
  return matched ? matched.reason : null;
}

const SENSITIVE_TOOLS = new Set([
  "timeline_delete_clip",
  "render_start",
  "render_batch",
  "quick_cut",
]);

export function needsApproval(toolName: string): boolean {
  return SENSITIVE_TOOLS.has(toolName);
}

export function approvalDetail(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "timeline_delete_clip":
      return `删除片段 ${String(args.clip_id ?? "")}${args.ripple ? "（波纹删除）" : ""}`;
    case "render_start":
      return "开始导出视频，会弹出保存位置选择";
    case "render_batch":
      return "批量导出多个视频，每个任务会弹出保存位置";
    case "quick_cut":
      return "会重建主画面 V1 轨、添加配乐与字幕，可撤销本次修改";
    default:
      return toolName;
  }
}
