/**
 * Centralized environment configuration.
 * All env vars are read and validated here — no process.env scattered across the codebase.
 */

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

const optional = (key, defaultValue) => process.env[key] ?? defaultValue;

module.exports = {
  NODE_ENV: optional("NODE_ENV", "development"),
  PORT: parseInt(optional("PORT", "3000"), 10),

  MONGODB_URI: optional("MONGODB_URI", "mongodb://localhost:27017/finance_dashboard"),

  JWT_SECRET: optional("JWT_SECRET", "dev_jwt_secret_replace_in_production"),
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "24h"),
  JWT_REFRESH_EXPIRES_IN: optional("JWT_REFRESH_EXPIRES_IN", "7d"),

  BCRYPT_ROUNDS: parseInt(optional("BCRYPT_ROUNDS", "10"), 10),

  RATE_LIMIT_WINDOW_MS: parseInt(optional("RATE_LIMIT_WINDOW_MS", "900000"), 10), // 15 min
  RATE_LIMIT_MAX: parseInt(optional("RATE_LIMIT_MAX", "100"), 10),
};
