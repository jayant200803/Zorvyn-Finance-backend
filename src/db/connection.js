const mongoose = require("mongoose");
const { MONGODB_URI, NODE_ENV } = require("../config/env");

// Suppress strictQuery deprecation warning
mongoose.set("strictQuery", true);

const CONNECTION_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/**
 * Establishes MongoDB connection.
 * Logs connection events and throws on failure so the server won't start with no DB.
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(MONGODB_URI, CONNECTION_OPTIONS);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB error:", err.message);
    });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

/**
 * Gracefully closes the DB connection.
 * Called during server shutdown.
 */
async function disconnectDB() {
  await mongoose.connection.close();
  console.log("MongoDB connection closed.");
}

module.exports = { connectDB, disconnectDB };
