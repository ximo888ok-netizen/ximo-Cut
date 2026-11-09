import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentRunMessage } from "./chat/AgentRunMessage";
import { createAssistantRun, finishRun, finishToolStep, startToolStep } from "./feed";

describe("AgentRunMessage", () => {
  it("渲染思考过程、工具步骤与最终回复", () => {
    let run = createAssistantRun("run-render", 1000);
    run = { ...run, reasoning: "先读取工程状态，再决定怎么裁剪。" };
    run = startToolStep(run, {
      id: "step-a",
      name: "project_get_state",
      args: {},
      at: 1100,
    });
    run = finishToolStep(run, {
      id: "step-a",
      output: { tracks: [{ clips: [{}] }] },
      at: 1200,
    });
    run = startToolStep(run, {
      id: "step-b",
      name: "ui_set_value",
      args: { target: "inspector.opacity", value: 62 },
      at: 1210,
    });
    run = finishToolStep(run, {
      id: "step-b",
      output: { ok: false, message: "找不到界面元素" },
      at: 1450,
    });
    run = finishRun(run, { status: "error", at: 1600, text: "第二处调整失败，已停止。" });

    const html = renderToStaticMarkup(createElement(AgentRunMessage, { message: run, now: 0 }));

    expect(html).toContain("思考过程");
    expect(html).toContain("先读取工程状态");
    expect(html).toContain("读取工程状态");
    expect(html).toContain("轨道、片段与播放头");
    expect(html).toContain("调整「inspector.opacity」");
    expect(html).toContain("找不到界面元素");
    expect(html).toContain("2 步");
    expect(html).toContain("失败");
    expect(html).toContain("第二处调整失败，已停止。");
    expect(html).toContain("600ms");
  });

  it("运行中展示思考状态与占位提示", () => {
    const run = createAssistantRun("run-live", 1000);
    const html = renderToStaticMarkup(createElement(AgentRunMessage, { message: run, now: 2600 }));
    expect(html).toContain("思考中");
    expect(html).toContain("正在思考");
    expect(html).toContain("1.6s");
  });

  it("可撤销的运行在撤销后保留已撤销标记", () => {
    const run = {
      ...finishRun(createAssistantRun("run-undo", 1000), {
        status: "done" as const,
        at: 1500,
        text: "已完成",
      }),
      canUndo: true,
    };
    const withButton = renderToStaticMarkup(
      createElement(AgentRunMessage, { message: run, now: 0 }),
    );
    expect(withButton).toContain("撤销本次修改");
    const undone = renderToStaticMarkup(
      createElement(AgentRunMessage, {
        message: { ...run, canUndo: false, undone: true },
        now: 0,
      }),
    );
    expect(undone).toContain("已撤销本次修改");
  });
});
