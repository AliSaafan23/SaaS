import fs from "fs";
import http from "http";
import https from "https";
import dotenv from "dotenv";
import { promisify } from "util";

// Initialize environment variables
dotenv.config();
if (process.env.NODE_ENV) process.env.NODE_ENV = process.env.NODE_ENV.trim();

// Import database connection
import { database } from "./src/config/index.js";

// Import app factory
import createApp from "./src/app.js";



// Import Socket.IO manager
import { initializeSocket, connectedUsers } from "./src/socketManager/index.js";
import {
  startPendingTripAutoCancelJob,
  stopPendingTripAutoCancelJob,
} from "./src/jobs/pendingTripAutoCancel.js";

class Server {
  constructor() {
    this.app = null;
    this.httpServer = null;
    this.httpsServer = null;
    this.io = null;
  }

  async initialize() {
    try {
      // Connect to database
      await database.connect();

      // Create Express app
      this.app = createApp();

      // Start background jobs
      startPendingTripAutoCancelJob();

      // Start appropriate server
      if (process.env.HTTPS_DISABLED === "true") {
        await this.startHttpServer();
      } else {
        await this.startHttpsServer();
      }

      // Handle graceful shutdown
      this.handleGracefulShutdown();
    } catch (error) {
      console.error("❌ Server initialization failed:", error.message);
      process.exit(1);
    }
  }

  async startHttpServer() {
    this.httpServer = http.createServer(this.app);

    // Create promisified version of listen
    const listen = promisify(this.httpServer.listen.bind(this.httpServer));

    try {
      /* HTTP Configuration
       * "127.0.0.1" for private or "0.0.0.0" for public access
       * if you want to expose to public use run this command in terminal ipconfig getifaddr en0 to get the ip address
       * then use http://ip:port replace ip and port
       */
      await listen(process.env.HTTP || 3000, process.env.PUBLIC_HOST === "true" ? "0.0.0.0" : "127.0.0.1");

      console.log(
        `🚀 HTTP Server running at http://${process.env.PUBLIC_HOST === "true" ? "0.0.0.0" : "127.0.0.1"}:${process.env.HTTP || 3000}`
      );
      console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🕒 Started at: ${new Date().toISOString()}`);

      // Initialize Socket.IO after server starts
      this.initializeSocketIO();
    } catch (error) {
      console.error("❌ HTTP Server error:", error);
      throw error;
    }
  }

  async startHttpsServer() {
    try {
      // Check if SSL certificates exist
      const certPaths = [
        process.env.PRIVATE_KEY,
        process.env.CERTIFICATE,
        process.env.CA,
      ];
      const missingCerts = certPaths.filter((path) => !fs.existsSync(path));

      if (missingCerts.length > 0) {
        throw new Error(
          `SSL certificates not found: ${missingCerts.join(", ")}`
        );
      }

      // Read SSL certificates asynchronously
      const readFile = promisify(fs.readFile);
      const [privateKey, certificate, ca] = await Promise.all([
        readFile(process.env.PRIVATE_KEY, "utf8"),
        readFile(process.env.CERTIFICATE, "utf8"),
        readFile(process.env.CA, "utf8"),
      ]);

      const httpsOptions = {
        key: privateKey,
        cert: certificate,
        ca: ca,
        requestCert: false,
        rejectUnauthorized: false,
      };

      this.httpsServer = https.createServer(httpsOptions, this.app);

      // Create promisified version of listen
      const listen = promisify(this.httpsServer.listen.bind(this.httpsServer));

      await listen(process.env.HTTPS || 443);

      console.log(
        `🔒 HTTPS Server running at https://${process.env.DOMAIN || "localhost"}:${process.env.HTTPS || 443}`
      );
      console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🕒 Started at: ${new Date().toISOString()}`);

      // Initialize Socket.IO after server starts
      this.initializeSocketIO();
    } catch (error) {
      console.error("❌ HTTPS Server error:", error);
      throw error;
    }
  }

  initializeSocketIO() {
    // Initialize Socket.IO
    try {
      const server = this.httpsServer || this.httpServer;
      initializeSocket(server, this.app);
      this.io = this.app.get("io"); // Get the io instance from the app
      console.log("📡 Socket.IO initialized successfully");
    } catch (error) {
      console.log(
        "📡 Socket.IO initialization failed - continuing without real-time features:",
        error.message
      );
    }
  }

  handleGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);

      try {
        // Close Socket.IO connections first
        if (this.io) {
          console.log("📡 Closing Socket.IO connections...");

          // Notify all connected clients about server shutdown
          this.io.emit("serverShutdown", {
            message: "Server is shutting down. Please reconnect in a moment.",
          });

          // Close all socket connections
          this.io.disconnectSockets();

          // Close the Socket.IO server
          this.io.close();

          // Clear the connected users map
          connectedUsers.driver.clear();
          connectedUsers.personal.clear();

          console.log("📡 Socket.IO connections closed");
        }

        // Close servers using promisified close methods
        const closeOperations = [];

        if (this.httpServer) {
          const closeHttp = promisify(
            this.httpServer.close.bind(this.httpServer)
          );
          closeOperations.push(
            closeHttp().then(() => console.log("🔌 HTTP server closed"))
          );
        }

        if (this.httpsServer) {
          const closeHttps = promisify(
            this.httpsServer.close.bind(this.httpsServer)
          );
          closeOperations.push(
            closeHttps().then(() => console.log("🔌 HTTPS server closed"))
          );
        }

        // Wait for all servers to close
        await Promise.all(closeOperations);

        // Stop background jobs
        stopPendingTripAutoCancelJob();

        // Close database connection
        await database.disconnect();

        console.log("✅ Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        console.error("❌ Error during graceful shutdown:", error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2")); // nodemon restart

    // Handle unhandled rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);

      if (reason && reason.code) {
        return; // Known error codes can be ignored
      }

      // For critical unhandled rejections, consider shutting down
      console.error("💥 Critical unhandled rejection - shutting down...");
      gracefulShutdown("unhandledRejection");
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("🚨 Uncaught Exception:", error);
      gracefulShutdown("uncaughtException");
    });
  }
}

// Initialize and start server
const server = new Server();
server.initialize().catch((error) => {
  console.error("💥 Fatal error:", error.message);
  process.exit(1);
});

// Export for testing
export default server;
