# 💸 Personal Finance Visualizer

A modern, responsive web app to track personal expenses, visualize category-wise spending, and manage monthly budgets — built with **Next.js**, **MongoDB**, **Recharts**, and **shadcn/ui**.

---

## 🚀 Features

### ✅ Stage 1 – Basic Transaction Tracking
- ➕ Add / ✏️ Edit / 🗑️ Delete transactions (`amount`, `date`, `description`)
- 📋 Transaction list view with recent entries
- 📊 Monthly Expenses Bar Chart using Recharts
- ✅ Form validations and error handling

### 🎯 Stage 2 – Categories & Insights
- 📂 Predefined transaction categories (Food, Rent, Transport, etc.)
- 🥧 Category-wise Pie Chart
- 📈 Dashboard summary cards:
  - Total Expenses
  - Category Breakdown
  - Recent Transactions

### 💡 Stage 3 – Budgeting System
- 🎯 Set monthly budgets per category
- 🧮 Budget vs Actual comparison chart
- 🔍 Smart insights: over-budget alerts, remaining balance per category

---

## 🛠️ Tech Stack

| Layer        | Tech Used                      |
|--------------|--------------------------------|
| Framework    | Next.js 14 (App Router)        |
| Frontend UI  | React, shadcn/ui, Tailwind CSS |
| Charts       | Recharts (Bar & Pie charts)    |
| Database     | MongoDB (with Mongoose)        |
| Validation   | Zod, React Hook Form           |
| State Mgmt   | React Context / Local State    |
| Deployment   | Vercel                         |

---

## 📦 Folder Structure

```bash
├── app/                  # Next.js App Router Pages
│   ├── dashboard/        # Main dashboard layout & views
│   └── api/              # API routes for transactions, budgets
├── components/           # Reusable UI components
├── lib/                  # DB connection, utility functions
├── models/               # Mongoose models for MongoDB
├── public/               # Static assets
└── styles/               # Global styles (Tailwind config)
