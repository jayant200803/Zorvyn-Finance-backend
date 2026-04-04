/**
 * Database seeder.
 * Run with: npm run seed
 * Creates default users and sample financial records.
 */

require("dotenv").config();
const { connectDB, disconnectDB } = require("./connection");
const User = require("../models/User");
const FinancialRecord = require("../models/FinancialRecord");

const DEFAULT_USERS = [
  {
    name: "System Admin",
    email: "admin@finance.dev",
    password: "Admin@123",
    role: "admin",
  },
  {
    name: "Alice Analyst",
    email: "analyst@finance.dev",
    password: "Analyst@123",
    role: "analyst",
  },
  {
    name: "Victor Viewer",
    email: "viewer@finance.dev",
    password: "Viewer@123",
    role: "viewer",
  },
];

const SAMPLE_RECORDS = [
  { amount: 85000, type: "income",  category: "Salary",     date: "2024-01-15", notes: "January salary" },
  { amount: 22000, type: "expense", category: "Rent",       date: "2024-01-01", notes: "Office rent" },
  { amount: 45000, type: "income",  category: "Freelance",  date: "2024-01-20", notes: "UI/UX contract" },
  { amount: 8500,  type: "expense", category: "Utilities",  date: "2024-01-10", notes: "Electricity & internet" },
  { amount: 85000, type: "income",  category: "Salary",     date: "2024-02-15", notes: "February salary" },
  { amount: 22000, type: "expense", category: "Rent",       date: "2024-02-01", notes: "Office rent" },
  { amount: 12000, type: "expense", category: "Marketing",  date: "2024-02-18", notes: "Social media ads" },
  { amount: 60000, type: "income",  category: "Consulting", date: "2024-02-25", notes: "Strategy consulting" },
  { amount: 85000, type: "income",  category: "Salary",     date: "2024-03-15", notes: "March salary" },
  { amount: 22000, type: "expense", category: "Rent",       date: "2024-03-01", notes: "Office rent" },
  { amount: 5500,  type: "expense", category: "Transport",  date: "2024-03-08", notes: "Travel reimbursement" },
  { amount: 32000, type: "income",  category: "Freelance",  date: "2024-03-22", notes: "Backend contract" },
  { amount: 85000, type: "income",  category: "Salary",     date: "2024-04-15", notes: "April salary" },
  { amount: 22000, type: "expense", category: "Rent",       date: "2024-04-01", notes: "Office rent" },
  { amount: 9800,  type: "expense", category: "Software",   date: "2024-04-12", notes: "SaaS subscriptions" },
];

async function seed() {
  await connectDB();

  console.log("\n Starting seed...\n");

  // Clear existing data
  await User.deleteMany({});
  await FinancialRecord.deleteMany({});
  console.log("🗑️  Cleared existing data");

  // Create users
  const createdUsers = [];
  for (const userData of DEFAULT_USERS) {
    const user = await User.create(userData);
    createdUsers.push(user);
    console.log(`👤 Created user: ${user.email} (${user.role})`);
  }

  // Create records — all owned by admin
  const admin = createdUsers.find((u) => u.role === "admin");
  for (const record of SAMPLE_RECORDS) {
    await FinancialRecord.create({ ...record, createdBy: admin._id });
  }
  console.log(`📊 Created ${SAMPLE_RECORDS.length} financial records`);

  console.log("\n✅ Seed complete!\n");
  console.log("Default credentials:");
  console.log("  Admin:    admin@finance.dev    / Admin@123");
  console.log("  Analyst:  analyst@finance.dev  / Analyst@123");
  console.log("  Viewer:   viewer@finance.dev   / Viewer@123\n");

  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
