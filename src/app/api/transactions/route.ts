import { NextRequest, NextResponse } from "next/server";
import Transaction from "@/lib/transaction.model";
import { connectToDatabase } from "@/lib/mongodb";
import { addWeeks, addMonths, addYears, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";
import type { Document } from "mongoose";

const CATEGORIES = [
  "Food", "Transport", "Bills", "Shopping", "Entertainment", "Health", "Travel", "Education", "Other"
];

function generateRecurringInstances(tx: any, monthStart: Date, monthEnd: Date): any[] {
  if (!tx.recurring || !tx.recurringType) return [];
  const instances: any[] = [];
  let nextDate = new Date(tx.date);
  const endDate = tx.recurringEndDate ? new Date(tx.recurringEndDate) : monthEnd;
  while (isBefore(nextDate, monthEnd) && isBefore(nextDate, endDate)) {
    if (isAfter(nextDate, monthStart) || nextDate.getTime() === monthStart.getTime()) {
      instances.push({ ...tx._doc, date: new Date(nextDate) });
    }
    if (tx.recurringType === "weekly") nextDate = addWeeks(nextDate, 1);
    else if (tx.recurringType === "monthly") nextDate = addMonths(nextDate, 1);
    else if (tx.recurringType === "yearly") nextDate = addYears(nextDate, 1);
    else break;
  }
  return instances;
}

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const transactions = await Transaction.find().sort({ date: -1 });
  // Generate recurring instances for the current month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  let allTx: any[] = [];
  for (const tx of transactions) {
    if (tx.recurring && tx.recurringType) {
      allTx = allTx.concat(generateRecurringInstances(tx, monthStart, monthEnd));
    } else {
      allTx.push(tx);
    }
  }
  // Sort by date desc
  allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return NextResponse.json(allTx);
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  const { amount, date, description, category, recurring, recurringType, recurringEndDate, type } = await req.json();
  if (!amount || !date || !description || !category) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const transaction = await Transaction.create({ amount, date, description, category, recurring, recurringType, recurringEndDate, type: type || "expense" });
  return NextResponse.json(transaction, { status: 201 });
}

export async function PUT(req: NextRequest) {
  await connectToDatabase();
  const { id, amount, date, description, category, recurring, recurringType, recurringEndDate, type } = await req.json();
  if (!id || !amount || !date || !description || !category) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const transaction = await Transaction.findByIdAndUpdate(
    id,
    { amount, date, description, category, recurring, recurringType, recurringEndDate, type: type || "expense" },
    { new: true }
  );
  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }
  return NextResponse.json(transaction);
}

export async function DELETE(req: NextRequest) {
  await connectToDatabase();
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Transaction ID is required." }, { status: 400 });
  }
  const transaction = await Transaction.findByIdAndDelete(id);
  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
} 