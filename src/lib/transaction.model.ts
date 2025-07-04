import mongoose, { Schema, models } from "mongoose";

const TransactionSchema = new Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, default: "Other" },
}, { timestamps: true });

export default models.Transaction || mongoose.model("Transaction", TransactionSchema); 