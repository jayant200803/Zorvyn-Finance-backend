const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");
const rateLimit = require("express-rate-limit");

const { NODE_ENV, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require("./config/env");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const authRoutes      = require("./modules/auth/auth.routes");
const usersRoutes     = require("./modules/users/users.routes");
const recordsRoutes   = require("./modules/records/records.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");

function createApp() {
  const app = express();

  // ── Security middleware ──────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({
    origin:  process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  }));

  // ── Rate limiting ────────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max:      RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { success: false, error: "Too many requests, please try again later." },
  });
  app.use("/api", limiter);

  // Stricter limiter for auth endpoints to prevent brute force
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { success: false, error: "Too many login attempts, please try again in 15 minutes." },
  });
  app.use("/api/v1/auth/login", authLimiter);

  // ── Body parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: "10kb" })); // Limit payload size
  app.use(express.urlencoded({ extended: false }));

  // ── Logging ──────────────────────────────────────────────────────────────
  if (NODE_ENV !== "test") {
    app.use(morgan(NODE_ENV === "development" ? "dev" : "combined"));
  }

  // ── Health check (no auth, no rate limit) ────────────────────────────────
  app.get("/health", (req, res) => {
    res.json({
      status:    "ok",
      timestamp: new Date().toISOString(),
      uptime:    process.uptime(),
      env:       NODE_ENV,
    });
  });

  // ── API Routes ───────────────────────────────────────────────────────────
  app.use("/api/v1/auth",      authRoutes);
  app.use("/api/v1/users",     usersRoutes);
  app.use("/api/v1/records",   recordsRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);

  // ── Error handling ───────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
