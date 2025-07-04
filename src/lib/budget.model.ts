import mongoose, { Schema, models } from "mongoose";

const BudgetSchema = new Schema({
  category: { type: String, required: true },
  month: { type: String, required: true }, // format: yyyy-MM
  amount: { type: Number, required: true },
}, { timestamps: true });

export default models.Budget || mongoose.model("Budget", BudgetSchema); 