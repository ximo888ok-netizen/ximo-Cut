import { Elysia, t } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { agentRoutes } from "./routes/agent";

export default new Elysia({ adapter: CloudflareAdapter })
  .use(agentRoutes)
  .get("/", () => ({ status: "ok" }))
  .get("/health", () => ({ healthy: true, timestamp: new Date().toISOString() }))
  .post(
    "/echo",
    ({ body }) => body,
    {
      body: t.Object({ message: t.String() }),
    }
  )
  // .compile() is required, it triggers AoT compilation at startup
  .compile();
