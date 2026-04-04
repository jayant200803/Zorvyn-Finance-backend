require("dotenv").config();

const { connectDB, disconnectDB } = require("./db/connection");
const { createApp } = require("./app");
const { PORT }      = require("./config/env");

async function startServer() {
  await connectDB();

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API base:   http://localhost:${PORT}/api/v1`);
    console.log(`❤️  Health:    http://localhost:${PORT}/health\n`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      console.log("Server closed.");
      process.exit(0);
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
      console.error("Forced shutdown after timeout.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  // Handle unhandled rejections — log and exit so the process doesn't limp along
  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise Rejection:", err);
    server.close(() => process.exit(1));
  });
}

startServer();
