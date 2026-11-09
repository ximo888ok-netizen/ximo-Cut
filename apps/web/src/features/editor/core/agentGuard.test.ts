import { describe, expect, it } from "vitest";
import { blockedAgentTarget, needsApproval, approvalDetail } from "./agentGuard";

describe("blockedAgentTarget", () => {
  it("拦截窗口控制与设置", () => {
    expect(blockedAgentTarget("button.window.close")).toContain("窗口控制");
    expect(blockedAgentTarget("settings.input.api-key")).toContain("设置");
    expect(blockedAgentTarget("button.settings")).toContain("设置");
    expect(blockedAgentTarget("button.home")).toContain("返回首页");
  });

  it("拦截文件对话框与录音", () => {
    expect(blockedAgentTarget("button.import")).toContain("导入文件");
    expect(blockedAgentTarget("input.import-srt")).toContain("导入字幕");
    expect(blockedAgentTarget("button.record-audio")).toContain("录音");
  });

  it("放行编辑相关控件", () => {
    expect(blockedAgentTarget("tab.filters")).toBeNull();
    expect(blockedAgentTarget("adjust.brightness")).toBeNull();
    expect(blockedAgentTarget("timeline.clip.clip-1")).toBeNull();
    expect(blockedAgentTarget("button.timeline.blade")).toBeNull();
  });
});

describe("approval", () => {
  it("删除与导出需要确认", () => {
    expect(needsApproval("timeline_delete_clip")).toBe(true);
    expect(needsApproval("render_start")).toBe(true);
    expect(needsApproval("render_batch")).toBe(true);
    expect(needsApproval("quick_cut")).toBe(true);
    expect(needsApproval("ui_click")).toBe(false);
    expect(needsApproval("timeline_split_clip")).toBe(false);
  });

  it("确认文案包含目标", () => {
    expect(approvalDetail("timeline_delete_clip", { clip_id: "clip-9" })).toContain("clip-9");
    expect(approvalDetail("timeline_delete_clip", { clip_id: "clip-9", ripple: true })).toContain(
      "波纹",
    );
  });
});
