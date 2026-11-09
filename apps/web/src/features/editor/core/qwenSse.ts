export interface QwenToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface QwenStreamState {
  content: string;
  reasoning: string;
  done: boolean;
  usage: unknown;
  calls: Map<number, { id: string; name: string; arguments: string }>;
}

export function createQwenStreamState(): QwenStreamState {
  return {
    content: "",
    reasoning: "",
    done: false,
    usage: null,
    calls: new Map(),
  };
}

export interface QwenDeltaSink {
  content?: (text: string) => void;
  reasoning?: (text: string) => void;
}

export function ingestQwenSseLine(
  state: QwenStreamState,
  rawLine: string,
  sink?: QwenDeltaSink,
): void {
  const line = rawLine.trim();
  if (!line.startsWith("data:")) {
    return;
  }
  const payload = line.slice(5).trim();
  if (!payload) {
    return;
  }
  if (payload === "[DONE]") {
    state.done = true;
    return;
  }

  let chunk: {
    choices?: Array<{
      delta?: {
        content?: string | null;
        reasoning_content?: string | null;
        tool_calls?: Array<{
          index?: number;
          id?: string;
          function?: { name?: string; arguments?: string };
        }>;
      };
    }>;
    usage?: unknown;
  };
  try {
    chunk = JSON.parse(payload);
  } catch {
    return;
  }

  if (chunk.usage) {
    state.usage = chunk.usage;
  }
  const delta = chunk.choices?.[0]?.delta;
  if (!delta) {
    return;
  }
  if (typeof delta.content === "string") {
    state.content += delta.content;
    sink?.content?.(delta.content);
  }
  if (typeof delta.reasoning_content === "string") {
    state.reasoning += delta.reasoning_content;
    sink?.reasoning?.(delta.reasoning_content);
  }
  for (const call of delta.tool_calls ?? []) {
    const index = typeof call.index === "number" ? call.index : 0;
    const current = state.calls.get(index) ?? { id: "", name: "", arguments: "" };
    if (call.id) {
      current.id = call.id;
    }
    if (call.function?.name) {
      current.name += call.function.name;
    }
    if (call.function?.arguments) {
      current.arguments += call.function.arguments;
    }
    state.calls.set(index, current);
  }
}

export function qwenStreamResult(state: QwenStreamState): {
  content: string;
  reasoning: string;
  toolCalls: QwenToolCall[];
  usage: unknown;
} {
  const toolCalls = [...state.calls.entries()]
    .sort(([a], [b]) => a - b)
    .filter(([, call]) => call.name.length > 0)
    .map(([index, call]) => ({
      id: call.id || `call-${index}-${Date.now().toString(36)}`,
      type: "function" as const,
      function: { name: call.name, arguments: call.arguments || "{}" },
    }));
  return {
    content: state.content,
    reasoning: state.reasoning,
    toolCalls,
    usage: state.usage,
  };
}
