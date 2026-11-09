import type { AiSettings } from "./settings";
import {
  QWEN_DEFAULT_BASE_URL,
  QWEN_SYSTEM_PROMPT,
  agentTools,
} from "./qwenAgent";
import { executeTool, safeParse } from "./qwenTools";
import {
  createQwenStreamState,
  ingestQwenSseLine,
  qwenStreamResult,
  type QwenDeltaSink,
  type QwenToolCall,
} from "./qwenSse";

export type QwenContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface QwenMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | QwenContentPart[];
  tool_calls?: QwenToolCall[];
  tool_call_id?: string;
}

export interface QwenStatus {
  reachable: boolean;
  configured: boolean;
  model?: string;
  error?: string;
}

export function qwenBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  return (trimmed.length > 0 ? trimmed : QWEN_DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export async function checkQwenStatus(
  baseUrl: string,
  apiKey: string,
): Promise<QwenStatus> {
  const key = apiKey.trim();
  if (!key) {
    return { reachable: true, configured: false, error: "尚未填写 API Key" };
  }
  try {
    const response = await fetch(`${qwenBaseUrl(baseUrl)}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      return { reachable: true, configured: true };
    }
    if (response.status === 401 || response.status === 403) {
      return {
        reachable: true,
        configured: false,
        error: "API Key 无效或已过期，请检查设置",
      };
    }
    return {
      reachable: true,
      configured: false,
      error: `服务返回 HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      reachable: false,
      configured: false,
      error: error instanceof Error ? error.message : "无法连接千问服务",
    };
  }
}

export interface AgentRunHooks {
  signal?: AbortSignal;
  onPhase?: (phase: "thinking" | "running") => void;
  onReasoningDelta?: (text: string) => void;
  onContentDelta?: (text: string) => void;
  onToolStart?: (tool: { id: string; name: string; args: Record<string, unknown> }) => void;
  onToolEnd?: (tool: { id: string; output: unknown; elapsedMs: number }) => void;
}

export async function runQwenAgentTurn(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  ai: AiSettings,
  hooks: AgentRunHooks = {},
): Promise<string | null> {
  const api = window.XimoCutAgent;
  if (!api) {
    return null;
  }
  const apiKey = ai.apiKey.trim();
  if (!apiKey) {
    throw new Error("还没有填写千问 API Key：打开设置 → 模型与服务，填写后重试");
  }

  const snapshot = api.snapshot();
  const messages: QwenMessage[] = [
    { role: "system", content: QWEN_SYSTEM_PROMPT },
    ...history.map((item) => ({ role: item.role, content: item.content })),
    {
      role: "user",
      content: `${message}\n\n当前工程状态：\n${JSON.stringify(api.getProject())}\n\n用户素材库：\n${JSON.stringify(api.getAssets())}\n\n当前界面上下文（选中片段、播放头、当前面板）：\n${JSON.stringify(snapshot.context)}\n\n当前界面语义树：\n${JSON.stringify(snapshot.elements)}`,
    },
  ];

  let streamed = "";
  let streamedReasoning = "";
  let needsContentBreak = false;
  let needsReasoningBreak = false;
  const ensureActive = () => {
    if (hooks.signal?.aborted) {
      throw new DOMException("已停止本次运行", "AbortError");
    }
  };
  const sink = {
    content: (text: string) => {
      if (needsContentBreak) {
        needsContentBreak = false;
        hooks.onContentDelta?.("\n\n");
      }
      streamed += text;
      hooks.onContentDelta?.(text);
    },
    reasoning: (text: string) => {
      if (needsReasoningBreak) {
        needsReasoningBreak = false;
        hooks.onReasoningDelta?.("\n\n");
      }
      streamedReasoning += text;
      hooks.onReasoningDelta?.(text);
    },
  };

  for (let round = 0; round < 8; round += 1) {
    ensureActive();
    hooks.onPhase?.("thinking");
    if (round > 0 && streamed.trim().length > 0) {
      needsContentBreak = true;
      streamed = "";
    }
    if (round > 0 && streamedReasoning.trim().length > 0) {
      needsReasoningBreak = true;
      streamedReasoning = "";
    }
    const result = await requestQwen(
      {
        apiKey,
        baseUrl: ai.baseUrl,
        model: ai.model,
        temperature: ai.temperature,
        maxTokens: ai.maxTokens,
        tools: agentTools,
        messages,
      },
      sink,
      hooks.signal,
    );
    if (result.toolCalls.length === 0) {
      return result.content || null;
    }

    hooks.onPhase?.("running");
    const results: Array<{ call: QwenToolCall; output: unknown }> = [];
    for (const [index, call] of result.toolCalls.entries()) {
      ensureActive();
      const id = `${call.id || "call"}-${round}-${index}`;
      const args = safeParse(call.function.arguments);
      hooks.onToolStart?.({ id, name: call.function.name, args });
      const startedAt = Date.now();
      let output: unknown;
      try {
        output = await executeTool(call.function.name, args);
      } catch (error) {
        output = {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
      hooks.onToolEnd?.({ id, output, elapsedMs: Date.now() - startedAt });
      results.push({ call, output });
      // 让界面完成一次渲染，保证下一步能找到刚切换出来的控件
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    }

    messages.push({
      role: "assistant",
      content: result.content,
      tool_calls: result.toolCalls,
    });
    for (const entry of results) {
      messages.push({
        role: "tool",
        tool_call_id: entry.call.id,
        content: JSON.stringify(entry.output),
      });
    }
  }

  return null;
}

export type QwenTurnResult = ReturnType<typeof qwenStreamResult>;

export async function requestQwen(
  options: {
    apiKey: string;
    baseUrl: string;
    model: string;
    messages: QwenMessage[];
    temperature?: number;
    maxTokens?: number;
    tools?: readonly unknown[];
  },
  sink?: QwenDeltaSink,
  signal?: AbortSignal,
): Promise<QwenTurnResult> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    modalities: ["text"],
    stream: true,
    stream_options: { include_usage: true },
  };
  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }
  if (options.maxTokens !== undefined) {
    body.max_tokens = options.maxTokens;
  }
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = "auto";
  }

  const combined = combineAbortSignals(signal, 180000);
  try {
    const response = await fetch(`${qwenBaseUrl(options.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: combined.signal,
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      throw new Error(describeHttpError(response.status, text));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const state = createQwenStreamState();
    let buffer = "";

    while (!state.done) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        ingestQwenSseLine(state, buffer.slice(0, newline), sink);
        buffer = buffer.slice(newline + 1);
        if (state.done) {
          break;
        }
        newline = buffer.indexOf("\n");
      }
    }
    if (!state.done && buffer.trim().length > 0) {
      ingestQwenSseLine(state, buffer, sink);
    }
    await reader.cancel().catch(() => undefined);
    return qwenStreamResult(state);
  } finally {
    combined.cleanup();
  }
}

function combineAbortSignals(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("请求超时")), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

function describeHttpError(status: number, text: string): string {
  let detail = text.trim();
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } | string };
    if (typeof parsed.error === "string") {
      detail = parsed.error;
    } else if (parsed.error?.message) {
      detail = parsed.error.message;
    }
  } catch {
    // 保留原始文本
  }
  if (detail.length > 240) {
    detail = `${detail.slice(0, 240)}…`;
  }
  return detail
    ? `千问接口返回 ${status}：${detail}`
    : `千问接口请求失败（HTTP ${status}）`;
}
