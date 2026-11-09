import { describe, expect, it } from "vitest";
import { createQwenStreamState, ingestQwenSseLine, qwenStreamResult } from "./qwenSse";

function feed(lines: string[]) {
  const state = createQwenStreamState();
  for (const line of lines) {
    ingestQwenSseLine(state, line);
  }
  return qwenStreamResult(state);
}

describe("ingestQwenSseLine", () => {
  it("拼接流式正文并识别结束标记", () => {
    const state = createQwenStreamState();
    const lines = [
      'data: {"choices":[{"delta":{"content":"你好"}}]}',
      'data: {"choices":[{"delta":{"content":"，世界"}}]}',
      "data: [DONE]",
    ];
    for (const line of lines) {
      ingestQwenSseLine(state, line);
    }
    expect(state.done).toBe(true);
    expect(qwenStreamResult(state).content).toBe("你好，世界");
    expect(qwenStreamResult(state).toolCalls).toHaveLength(0);
  });

  it("累计分片的工具调用参数", () => {
    const result = feed([
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"timeline_","arguments":"{\\"clip_"}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"split_clip","arguments":"id\\":\\"clip-1\\",\\"at\\":3}"}}]}}]}',
      "data: [DONE]",
    ]);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].id).toBe("call_1");
    expect(result.toolCalls[0].function.name).toBe("timeline_split_clip");
    expect(JSON.parse(result.toolCalls[0].function.arguments)).toEqual({
      clip_id: "clip-1",
      at: 3,
    });
  });

  it("保留思考内容并忽略无效数据行", () => {
    const result = feed([
      ": ping",
      "data: not-json",
      'data: {"choices":[{"delta":{"reasoning_content":"先分析素材。"}}]}',
      'data: {"choices":[{"delta":{"content":"方案如下"}}]}',
      'data: {"usage":{"prompt_tokens":12,"completion_tokens":5}}',
    ]);
    expect(result.reasoning).toBe("先分析素材。");
    expect(result.content).toBe("方案如下");
    expect(result.usage).toEqual({ prompt_tokens: 12, completion_tokens: 5 });
  });

  it("没有 data 前缀的行不参与解析", () => {
    expect(feed(['{"choices":[{"delta":{"content":"x"}}]}']).content).toBe("");
  });
});
