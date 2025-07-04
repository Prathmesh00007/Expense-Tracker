import { NextRequest, NextResponse } from "next/server";
import Transaction from "@/lib/transaction.model";
import { connectToDatabase } from "@/lib/mongodb";

const CATEGORIES = [
  "Food", "Transport", "Bills", "Shopping", "Entertainment", "Health", "Travel", "Education", "Other"
];

export async function GET() {
  await connectToDatabase();
  const transactions = await Transaction.find().sort({ date: -1 });
  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  const body = await req.json();
  console.log("POST payload:", body);

  const { amount, date, description, category } = body;
  if (!amount||!date||!description||!category) {
    return NextResponse.json({ error:"All fields are required." },{ status:400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error:"Invalid category." },{ status:400 });
  }

  const created = await Transaction.create({ amount, date, description, category });
  return NextResponse.json(created,{ status:201 });
}

export async function PUT(req: NextRequest) {
  await connectToDatabase();
  const { id, amount, date, description, category } = await req.json();
  if (!id || !amount || !date || !description || !category) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const transaction = await Transaction.findByIdAndUpdate(
    id,
    { amount, date, description, category },
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