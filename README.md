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
```

## 🧪 Validations & Error Handling
Form validations using React Hook Form + Zod

User-friendly error states (empty fields, invalid amounts)

Backend validation for data integrity

## 📈 Charts
MonthlyExpensesChart.tsx: Bar chart grouped by month

CategoryBreakdownChart.tsx: Pie chart for category-wise distribution

BudgetComparisonChart.tsx: Grouped bar chart for budget vs actual

## ⚙️ Setup Instructions
```bash
# Clone the repository
git clone https://github.com/your-username/personal-finance-visualizer.git
cd personal-finance-visualizer

# Install dependencies
npm install

# Add .env file
MONGODB_URI=your_mongodb_connection_string

# Run the development server
npm run dev
# App runs at http://localhost:3000
```

## 🔐 Environment Variables
```env
MONGODB_URI=<your_mongodb_uri>
```

## 📅 Future Improvements
🧠 AI-generated saving insights (OpenAI / local model)

📱 Mobile-first gesture UI for expense tracking

📊 CSV / PDF export

🔒 Auth via NextAuth.js (Google login)

🔔 Notification system for over-budget alerts


