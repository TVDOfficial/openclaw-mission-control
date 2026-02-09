import { readFileSync } from "fs";
import next from "next";
import { createServer } from "http";

// Load .env.local BEFORE next initializes
try {
  const envFile = readFileSync(".env.local", "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq);
      const val = trimmed.slice(eq + 1);
      process.env[key] = val;
    }
  }
} catch {}

const app = next({ dev: false, dir: "." });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(3333, "0.0.0.0", () => {
    console.log("> Mission Control ready on http://0.0.0.0:3333");
    console.log(`> Gateway: ${process.env.OPENCLAW_GATEWAY_URL}`);
    console.log(`> Token: ${process.env.OPENCLAW_GATEWAY_TOKEN?.slice(0,8)}...`);
  });
});
