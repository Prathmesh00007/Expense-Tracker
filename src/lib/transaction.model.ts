import mongoose, { Schema, models } from "mongoose";

const TransactionSchema = new Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, default: "Other" },
  recurring: { type: Boolean, default: false },
  recurringType: { type: String, enum: ["weekly", "monthly", "yearly", null], default: null },
  recurringEndDate: { type: Date, default: null },
  type: { type: String, enum: ["expense", "income"], default: "expense" },
}, { timestamps: true });

export default models.Transaction || mongoose.model("Transaction", TransactionSchema); 