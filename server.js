import { database } from "./src/config/index.js";
import createApp from "./src/app.js";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT || process.env.HTTP || 3000);
const host =
  process.env.PUBLIC_HOST === "true" || process.env.NODE_ENV === "production"
    ? "0.0.0.0"
    : "127.0.0.1";

async function start() {
  await database.connect();
  const app = createApp();
  const server = http.createServer(app);

  server.listen(port, host, () => {
    console.log(`🚀 SaaS Server http://${host}:${port}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

start().catch((err) => {
  console.error("❌ Server failed:", err.message);
  process.exit(1);
});
