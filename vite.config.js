import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Lets `npm run dev` serve /api/chat locally, exactly like Vercel does in production.
function localApi(env) {
  return {
    name: "phantm-local-api",
    configureServer(server) {
      server.middlewares.use("/api/chat", async (req, res) => {
        Object.assign(process.env, env);
        let body = "";
        for await (const chunk of req) body += chunk;
        try {
          req.body = JSON.parse(body || "{}");
        } catch {
          req.body = {};
        }
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (obj) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(obj));
        };
        try {
          const { default: handler } = await server.ssrLoadModule("/api/chat.js");
          await handler(req, res);
        } catch (err) {
          console.error(err);
          res.status(500).json({ reply: "Local API error." });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return { plugins: [react(), localApi(env)] };
});
