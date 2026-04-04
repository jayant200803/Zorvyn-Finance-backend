const mongoose = require("mongoose");

const CATEGORIES = [
  "Salary",
  "Freelance",
  "Consulting",
  "Investment",
  "Rent",
  "Utilities",
  "Marketing",
  "Transport",
  "Software",
  "Hardware",
  "Taxes",
  "Insurance",
  "Other",
];

const financialRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    type: {
      type: String,
      required: [true, "Type is required"],
      enum: {
        values: ["income", "expense"],
        message: "Type must be either income or expense",
      },
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false, // Hidden by default — soft delete is transparent
    },
    deletedAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Compound index for the most common dashboard query pattern
financialRecordSchema.index({ isDeleted: 1, date: -1 });
financialRecordSchema.index({ isDeleted: 1, type: 1, date: -1 });
financialRecordSchema.index({ isDeleted: 1, category: 1, type: 1 });
financialRecordSchema.index({ createdBy: 1, isDeleted: 1 });

// ── Query Middleware: Always exclude soft-deleted docs ─────────────────────
// This means isDeleted filter is never forgotten in a query
const softDeleteFilter = function () {
  if (!this.getQuery().hasOwnProperty("isDeleted")) {
    this.where({ isDeleted: false });
  }
};

financialRecordSchema.pre("find", softDeleteFilter);
financialRecordSchema.pre("findOne", softDeleteFilter);
financialRecordSchema.pre("countDocuments", softDeleteFilter);
financialRecordSchema.pre("aggregate", function () {
  // Inject isDeleted filter at the start of every aggregation pipeline
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
});

// ── Instance Method: Soft delete ──────────────────────────────────────────
financialRecordSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// ── Static: Suggested categories list ─────────────────────────────────────
financialRecordSchema.statics.getCategories = () => CATEGORIES;

module.exports = mongoose.model("FinancialRecord", financialRecordSchema);
