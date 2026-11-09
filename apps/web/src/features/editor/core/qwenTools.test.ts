// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { EditCommand } from "./editorStore";
import { executeTool } from "./qwenTools";

const commands: EditCommand[] = [];

const fakeApi = {
  execute: (command: EditCommand) => {
    commands.push(command);
    return { ok: true, message: "ok", revision: 1 };
  },
  audio: {
    listSfx: async () => [
      { id: "sfx-1", name: "转场嗖", category: "转场", duration: 1, path: "" },
    ],
    insertSfx: async () => ({ ok: true, message: "ok", revision: 1 }),
  },
  getProject: () => ({
    tracks: [
      {
        clips: [
          {
            id: "text-1",
            kind: "text",
            text: "旧标题",
            textStyle: { size: 1, color: "white", position: "bottom" },
          },
        ],
      },
    ],
  }),
};

afterEach(() => {
  commands.length = 0;
  delete window.XimoCutAgent;
});

function installFakeApi() {
  window.XimoCutAgent = fakeApi as unknown as typeof window.XimoCutAgent;
}

describe("Agent 剪辑工具", () => {
  it("音量、速度、调色、文字和转场工具映射到正确的编辑命令", async () => {
    installFakeApi();

    await executeTool("clip_set_volume", { clip_id: "clip-1", volume_db: -12 });
    await executeTool("clip_set_speed", { clip_id: "clip-1", speed: 2 });
    await executeTool("clip_set_adjust", {
      clip_id: "clip-1",
      adjust: { brightness: 12, saturation: -8 },
    });
    await executeTool("clip_set_text_style", {
      clip_id: "text-1",
      text: "新标题",
      size: 1.5,
      color: "yellow",
      animation: "fade",
    });
    await executeTool("clip_set_transition", {
      clip_id: "clip-1",
      edge: "in",
      type: "fade",
      duration: 0.6,
    });

    expect(commands[0]).toMatchObject({
      type: "clip.update",
      clipId: "clip-1",
      patch: { volumeDb: -12 },
    });
    expect(commands[1]).toMatchObject({ type: "clip.speed", clipId: "clip-1", speed: 2 });
    expect(commands[2]).toMatchObject({
      type: "clip.update",
      clipId: "clip-1",
      patch: { adjust: { brightness: 12, saturation: -8 } },
    });
    expect(commands[3]).toMatchObject({
      type: "clip.update",
      clipId: "text-1",
      patch: { text: "新标题", textStyle: { size: 1.5, color: "yellow", animation: "fade" } },
    });
    expect(commands[4]).toMatchObject({
      type: "clip.transition",
      clipId: "clip-1",
      edge: "in",
      transition: { type: "fade", duration: 0.6 },
    });
  });

  it("插入音效缺少参数时返回失败，而不是命中列表里的第一个音效", async () => {
    installFakeApi();

    const result = await executeTool("sfx_insert", {});

    expect(result).toMatchObject({ ok: false });
  });
});
