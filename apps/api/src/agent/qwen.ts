import { env } from "cloudflare:workers";
import { agentTools } from "./tools";

interface QwenMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: QwenToolCall[];
}

export interface QwenToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface QwenResult {
  ok: boolean;
  content: string;
  tool_calls: QwenToolCall[];
  error?: string;
}

const DEFAULT_MODEL = "qwen3.8-omni-flash";

const SYSTEM_PROMPT = `你是 ximo-Cut 的自动剪辑代理，运行在一个 Windows 桌面窗口式剪辑软件中。

规则：
1. 只能通过工具操作软件，不能输出 FFmpeg 命令，不能假设文件路径。
2. 只能使用工程中真实存在的 clip_id、track_id、asset_id，禁止编造。
3. 修改时间线前先读取 project_get_state 或 ui_snapshot。
4. 点击或拖拽 UI 时使用 data-agent-id，绝不使用屏幕坐标。
5. 时间统一用秒，保留三位小数；最终由编辑器吸附到帧。
6. 一次最多执行 20 个修改动作，大计划拆成多个事务。
7. 不确定用户意图时，先说明方案，等待确认。
8. 不要删除用户原始素材，不要覆盖工程。
9. 删除、导出、关闭窗口等敏感操作必须明确告知用户。
10. 用简体中文回复，说明你做了什么、结果如何。
11. 用户要求生成剪辑方案或自动剪时，必须调用 plan_propose，并且只引用用户素材库里真实存在的 asset_id；不要凭空编造素材。`;

export function qwenStatus(): {
  ok: boolean;
  qwen_configured: boolean;
  model: string;
  base_url: string;
} {
  const bindings = env as unknown as Record<string, string | undefined>;
  return {
    ok: true,
    qwen_configured: Boolean(bindings.DASHSCOPE_API_KEY),
    model: DEFAULT_MODEL,
    base_url:
      bindings.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
  };
}

export async function askQwen(payload: {
  message: string;
  project?: unknown;
  assets?: unknown;
  ui?: unknown;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  api_key?: string;
}): Promise<QwenResult> {
  const bindings = env as unknown as Record<string, string | undefined>;
  const apiKey = payload.api_key?.trim() || bindings.DASHSCOPE_API_KEY;
  const baseUrl = bindings.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1";

  if (!apiKey) {
    return {
      ok: false,
      content: "",
      tool_calls: [],
      error:
        "Qwen 未配置：请在软件设置中填写 API Key，或在 apps/api/.dev.vars 添加 DASHSCOPE_API_KEY 后重启 API 服务。",
    };
  }

  const model = payload.model?.trim() || DEFAULT_MODEL;
  const temperature = Math.min(2, Math.max(0, payload.temperature ?? 0.3));
  const maxTokens = Math.round(Math.min(8192, Math.max(256, payload.max_tokens ?? 2048)));
  const messages: QwenMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(payload.history ?? []).map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: "user",
      content: `${payload.message}\n\n当前工程状态：\n${JSON.stringify(payload.project ?? {})}\n\n用户素材库：\n${JSON.stringify(payload.assets ?? [])}\n\n当前界面语义树：\n${JSON.stringify(payload.ui ?? {})}`,
    },
  ];

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        tools: agentTools,
        tool_choice: "auto",
        temperature,
        max_tokens: maxTokens,
        reasoning_effort: "medium",
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        content: "",
        tool_calls: [],
        error: `Qwen HTTP ${response.status}: ${await response.text()}`,
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: QwenToolCall[];
        };
      }>;
    };
    const message = data.choices?.[0]?.message;
    return {
      ok: true,
      content: message?.content ?? "",
      tool_calls: message?.tool_calls ?? [],
    };
  } catch (error) {
    return {
      ok: false,
      content: "",
      tool_calls: [],
      error: error instanceof Error ? error.message : "Qwen 调用失败",
    };
  }
}
