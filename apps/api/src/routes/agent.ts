import { Elysia } from "elysia";
import { askQwen, qwenStatus } from "../agent/qwen";

interface AgentChatBody {
  message?: string;
  project?: unknown;
  assets?: unknown;
  ui?: unknown;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  api_key?: string;
}

export const agentRoutes = new Elysia({ prefix: "/agent" })
  .onAfterHandle(({ set }) => {
    set.headers["Access-Control-Allow-Origin"] = "*";
    set.headers["Access-Control-Allow-Headers"] = "Content-Type";
    set.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  })
  .options("/chat", ({ set }) => {
    set.status = 204;
    return "";
  })
  .get("/status", () => qwenStatus())
  .post("/chat", async ({ body, set }) => {
    const payload = (body ?? {}) as AgentChatBody;
    if (typeof payload.message !== "string" || payload.message.trim().length === 0) {
      set.status = 400;
      return { ok: false, error: "message 不能为空" };
    }

    return askQwen({
      message: payload.message,
      project: payload.project,
      assets: payload.assets,
      ui: payload.ui,
      history: payload.history,
      model: payload.model,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
      api_key: payload.api_key,
    });
  });
