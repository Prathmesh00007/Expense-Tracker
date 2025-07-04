import { NextRequest, NextResponse } from "next/server";
import Budget from "@/lib/budget.model";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month) {
    return NextResponse.json({ error: "Month is required (yyyy-MM)." }, { status: 400 });
  }
  const budgets = await Budget.find({ month });
  return NextResponse.json(budgets);
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  const { category, month, amount } = await req.json();
  if (!category || !month || !amount) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  // Upsert budget for category/month
  const budget = await Budget.findOneAndUpdate(
    { category, month },
    { amount },
    { upsert: true, new: true }
  );
  return NextResponse.json(budget);
} 