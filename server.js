import { database } from "./src/config/index.js";
import createApp from "./src/app.js";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.HTTP || 3000;

async function start() {
  await database.connect();
  const app = createApp();
  const server = http.createServer(app);

  server.listen(port, process.env.PUBLIC_HOST === "true" ? "0.0.0.0" : "127.0.0.1", () => {
    console.log(`🚀 SaaS Server http://127.0.0.1:${port}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

start().catch((err) => {
  console.error("❌ Server failed:", err.message);
  process.exit(1);
});
