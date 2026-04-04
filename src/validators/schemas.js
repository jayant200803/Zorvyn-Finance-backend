const { z } = require("zod");

// ── Reusable field schemas ─────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((val) => !isNaN(new Date(val).getTime()), "Invalid date value");

const paginationSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ── Auth ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("Invalid email format").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

// ── Users ─────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    z.string().email().toLowerCase().trim(),
  password: passwordSchema,
  role:     z.enum(["viewer", "analyst", "admin"]),
});

const updateUserSchema = z
  .object({
    name:   z.string().min(2).max(100).trim().optional(),
    role:   z.enum(["viewer", "analyst", "admin"]).optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

const listUsersSchema = paginationSchema.extend({
  role:   z.enum(["viewer", "analyst", "admin"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  search: z.string().optional(),
});

// ── Financial Records ────────────────────────────────────────────────────

const createRecordSchema = z.object({
  amount:   z.number({ invalid_type_error: "Amount must be a number" }).positive("Amount must be > 0"),
  type:     z.enum(["income", "expense"], { errorMap: () => ({ message: "Type must be income or expense" }) }),
  category: z.string().min(1, "Category is required").max(100).trim(),
  date:     dateSchema,
  notes:    z.string().max(500).trim().optional(),
});

const updateRecordSchema = createRecordSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

const listRecordsSchema = paginationSchema.extend({
  type:      z.enum(["income", "expense"]).optional(),
  category:  z.string().optional(),
  date_from: dateSchema.optional(),
  date_to:   dateSchema.optional(),
  sort:      z.enum(["date_asc", "date_desc", "amount_asc", "amount_desc"]).default("date_desc"),
}).refine(
  (data) => {
    if (data.date_from && data.date_to) {
      return new Date(data.date_from) <= new Date(data.date_to);
    }
    return true;
  },
  { message: "date_from must be before or equal to date_to", path: ["date_from"] }
);

// ── Dashboard ────────────────────────────────────────────────────────────

const dashboardRangeSchema = z.object({
  date_from: dateSchema.optional(),
  date_to:   dateSchema.optional(),
});

const monthlyTrendsSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

module.exports = {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  listUsersSchema,
  createRecordSchema,
  updateRecordSchema,
  listRecordsSchema,
  dashboardRangeSchema,
  monthlyTrendsSchema,
  mongoIdSchema,
};
