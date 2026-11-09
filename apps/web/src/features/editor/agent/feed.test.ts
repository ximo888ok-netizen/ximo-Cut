import { describe, expect, it } from "vitest";
import {
  createAssistantRun,
  describeTool,
  finishRun,
  finishToolStep,
  formatElapsed,
  startToolStep,
} from "./feed";
import { outputFailed, summarizeToolResult } from "./feedResult";

describe("describeTool", () => {
  it("把界面点击翻译成可读步骤", () => {
    expect(describeTool("ui_click", { target: "button.export" })).toEqual({
      title: "点击「button.export」",
      detail: "button.export",
    });
  });

  it("展示滑块目标与数值", () => {
    const display = describeTool("ui_set_value", {
      target: "inspector.opacity",
      value: 62,
    });
    expect(display.title).toBe("调整「inspector.opacity」");
    expect(display.detail).toBe("设为 62");
  });

  it("展示裁剪方向与时长", () => {
    const display = describeTool("timeline_trim_clip", {
      clip_id: "clip-02",
      edge: "start",
      delta: 0.5,
    });
    expect(display.title).toBe("裁剪片段");
    expect(display.detail).toContain("入点");
    expect(display.detail).toContain("+0.5s");
  });

  it("汇总剪辑方案的镜头数与总时长", () => {
    const display = describeTool("plan_propose", {
      shots: [{ duration: 3 }, { duration: 4.5 }],
    });
    expect(display.detail).toBe("2 个镜头 · 7.5s");
  });

  it("汇总导出设置", () => {
    const display = describeTool("render_update_settings", {
      settings: { width: 1280, height: 720, fps: 30, format: "webm" },
    });
    expect(display.detail).toBe("1280×720 · 30fps · WEBM");
  });

  it("对未知工具回退到原始名称", () => {
    expect(describeTool("mystery_tool").title).toBe("mystery_tool");
  });
});

describe("summarizeToolResult", () => {
  it("统计界面元素数量", () => {
    expect(summarizeToolResult({ elements: [{}, {}, {}] })).toBe("3 个可操作元素");
  });

  it("统计轨道与片段数量", () => {
    expect(
      summarizeToolResult({
        tracks: [{ clips: [{}, {}] }, { clips: [{}] }],
      }),
    ).toBe("2 条轨道 · 3 个片段");
  });

  it("优先展示失败原因", () => {
    expect(summarizeToolResult({ ok: false, message: "轨道已锁定" })).toBe("轨道已锁定");
    expect(outputFailed({ ok: false, message: "轨道已锁定" })).toBe(true);
    expect(outputFailed({ ok: true })).toBe(false);
  });

  it("展示成功消息", () => {
    expect(summarizeToolResult({ ok: true, message: "已应用 4 个镜头" })).toBe("已应用 4 个镜头");
  });
});

describe("run state updates", () => {
  it("步骤开始与结束时状态正确", () => {
    const run = createAssistantRun("run-1", 1000);
    expect(run.status).toBe("thinking");
    const started = startToolStep(run, {
      id: "step-1",
      name: "ui_click",
      args: { target: "button.export" },
      at: 1100,
    });
    expect(started.status).toBe("running");
    expect(started.steps?.[0]?.status).toBe("running");
    expect(started.steps?.[0]?.title).toBe("点击「button.export」");

    const done = finishToolStep(started, {
      id: "step-1",
      output: { ok: true, message: "已点击" },
      at: 1400,
    });
    expect(done.steps?.[0]?.status).toBe("ok");
    expect(done.steps?.[0]?.endedAt).toBe(1400);
    expect(done.steps?.[0]?.result).toBe("已点击");
    expect(done.steps?.[0]?.output).toEqual({ ok: true, message: "已点击" });
  });

  it("失败的工具结果标记为错误", () => {
    const run = startToolStep(createAssistantRun("run-2", 0), {
      id: "step-2",
      name: "timeline_delete_clip",
      args: { clip_id: "clip-9" },
      at: 10,
    });
    const failed = finishToolStep(run, {
      id: "step-2",
      output: { ok: false, message: "找不到片段" },
      at: 30,
    });
    expect(failed.steps?.[0]?.status).toBe("error");
    expect(failed.steps?.[0]?.result).toBe("找不到片段");
  });

  it("结束运行会写入状态、耗时与最终文本", () => {
    const done = finishRun(createAssistantRun("run-3", 100), {
      status: "done",
      at: 2100,
      text: "已完成调整",
    });
    expect(done.status).toBe("done");
    expect(done.text).toBe("已完成调整");
    expect(formatElapsed((done.endedAt ?? 0) - (done.startedAt ?? 0))).toBe("2.0s");
  });
});

describe("formatElapsed", () => {
  it("毫秒与秒的展示规则", () => {
    expect(formatElapsed(240)).toBe("240ms");
    expect(formatElapsed(1500)).toBe("1.5s");
    expect(formatElapsed(0)).toBe("0s");
  });
});
