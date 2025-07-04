"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO, addMonths, format as formatDate, startOfMonth } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Progress } from "@/components/ui/progress";

const CATEGORIES = [
  "Food", "Transport", "Bills", "Shopping", "Entertainment", "Health", "Travel", "Education", "Other"
];

const CATEGORY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#d0ed57"
];

const transactionSchema = z.object({
  amount: z.number().min(0.01, "Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
});

type Transaction = {
  _id: string;
  amount: number;
  date: string;
  description: string;
  category: string;
};

type FormData = z.infer<typeof transactionSchema>;

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<{ category: string; month: string; amount: number }[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => format(startOfMonth(new Date()), "yyyy-MM"));

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { amount: 0, date: "", description: "", category: CATEGORIES[0] },
  });

  async function fetchTransactions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      setTransactions(data);
    } catch (e) {
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { ...data, id: editId } : data),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to save transaction.");
        setLoading(false);
        return;
      }
      reset({ amount: 0, date: "", description: "", category: CATEGORIES[0] });
      setEditId(null);
      fetchTransactions();
    } catch (e) {
      setError("Failed to save transaction.");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(tx: Transaction) {
    setEditId(tx._id);
    setValue("amount", tx.amount);
    setValue("date", tx.date.slice(0, 10));
    setValue("description", tx.description);
    setValue("category", tx.category);
  }

  async function handleDelete(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to delete transaction.");
        setLoading(false);
        return;
      }
      fetchTransactions();
    } catch (e) {
      setError("Failed to delete transaction.");
    } finally {
      setLoading(false);
    }
  }

  // Dashboard summary
  const totalExpenses = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const categoryTotals = CATEGORIES.map((cat) => ({
    category: cat,
    total: transactions.filter((tx) => tx.category === cat).reduce((sum, tx) => sum + tx.amount, 0),
  })).filter((c) => c.total > 0);
  const mostRecent = transactions.slice(0, 5);

  // Group transactions by month for the bar chart
  const monthlyData = transactions.reduce<Record<string, number>>((acc, tx) => {
    const month = format(parseISO(tx.date), "yyyy-MM");
    acc[month] = (acc[month] || 0) + tx.amount;
    return acc;
  }, {});
  const chartData = Object.entries(monthlyData).map(([month, total]) => ({
    month,
    total,
  }));

  // Fetch budgets for selected month
  async function fetchBudgets(month: string) {
    setBudgetLoading(true);
    setBudgetError(null);
    try {
      const res = await fetch(`/api/budgets?month=${month}`);
      const data = await res.json();
      setBudgets(data);
    } catch (e) {
      setBudgetError("Failed to load budgets.");
    } finally {
      setBudgetLoading(false);
    }
  }

  useEffect(() => {
    fetchBudgets(selectedMonth);
  }, [selectedMonth]);

  // Set or update budget
  async function setBudget(category: string, amount: number) {
    setBudgetLoading(true);
    setBudgetError(null);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, month: selectedMonth, amount }),
      });
      if (!res.ok) {
        const err = await res.json();
        setBudgetError(err.error || "Failed to set budget.");
        setBudgetLoading(false);
        return;
      }
      fetchBudgets(selectedMonth);
    } catch (e) {
      setBudgetError("Failed to set budget.");
    } finally {
      setBudgetLoading(false);
    }
  }

  // Budget vs actual data
  const budgetMap = Object.fromEntries(budgets.map((b) => [b.category, b.amount]));
  const actualMap = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = transactions.filter((tx) => tx.category === cat && tx.date.startsWith(selectedMonth)).reduce((sum, tx) => sum + tx.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  // Insights
  const insights = CATEGORIES.map((cat) => {
    const budget = budgetMap[cat] || 0;
    const actual = actualMap[cat] || 0;
    if (!budget) return null;
    if (actual > budget) return `Overspending in ${cat}`;
    if (actual > 0.8 * budget) return `Close to budget in ${cat}`;
    if (actual > 0) return `On track in ${cat}`;
    return null;
  }).filter(Boolean);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Personal Finance Visualizer</h1>
      <p className="mb-8 text-lg text-muted-foreground">Track your expenses, visualize your spending, and manage your budget.</p>
      <div className="w-full max-w-4xl space-y-6">
        {/* Dashboard summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                {categoryTotals.length === 0 ? (
                  <li className="text-muted-foreground">No data</li>
                ) : (
                  categoryTotals.slice(0, 3).map((c, i) => (
                    <li key={c.category} className="flex justify-between">
                      <span>{c.category}</span>
                      <span>₹{c.total.toFixed(2)}</span>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                {mostRecent.length === 0 ? (
                  <li className="text-muted-foreground">No data</li>
                ) : (
                  mostRecent.map((tx) => (
                    <li key={tx._id} className="flex justify-between">
                      <span>{tx.description}</span>
                      <span>₹{tx.amount.toFixed(2)}</span>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Budgeting section */}
        <Card>
          <CardHeader>
            <CardTitle>Set Monthly Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-1 text-left">Category</th>
                    <th className="px-2 py-1 text-left">Budget (₹)</th>
                    <th className="px-2 py-1 text-left">Actual (₹)</th>
                    <th className="px-2 py-1 text-left">Progress</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map((cat, i) => {
                    const budget = budgetMap[cat] || 0;
                    const actual = actualMap[cat] || 0;
                    return (
                      <tr key={cat} className="border-b">
                        <td className="px-2 py-1">{cat}</td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            step="0.01"
                            className="w-24"
                            defaultValue={budget}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0 && val !== budget) setBudget(cat, val);
                            }}
                            disabled={budgetLoading}
                          />
                        </td>
                        <td className="px-2 py-1">{actual.toFixed(2)}</td>
                        <td className="px-2 py-1 w-40">
                          <Progress value={budget ? Math.min((actual / budget) * 100, 100) : 0} />
                        </td>
                        <td className="px-2 py-1">
                          {budget > 0 && actual > budget && (
                            <span className="text-destructive text-xs font-semibold">Over</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {budgetError && <div className="text-destructive mt-2 text-sm">{budgetError}</div>}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        {insights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Spending Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                {insights.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Transaction form */}
        <Card>
          <CardHeader>
            <CardTitle>{editId ? "Edit Transaction" : "Add Transaction"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input type="number" step="0.01" id="amount" {...register("amount", { valueAsNumber: true })} />
                {errors.amount && <p className="text-destructive text-xs mt-1">{errors.amount.message}</p>}
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input type="date" id="date" {...register("date")} />
                {errors.date && <p className="text-destructive text-xs mt-1">{errors.date.message}</p>}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input type="text" id="description" {...register("description")} />
                {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-destructive text-xs mt-1">{errors.category.message}</p>}
              </div>
              <Button type="submit" className="md:col-span-4 w-full" disabled={loading}>
                {editId ? "Update" : "Add"} Transaction
              </Button>
              {editId && (
                <Button type="button" variant="secondary" className="md:col-span-4 w-full" onClick={() => { reset({ amount: 0, date: "", description: "", category: CATEGORIES[0] }); setEditId(null); }}>
                  Cancel Edit
                </Button>
              )}
            </form>
            {error && <div className="text-destructive mt-2 text-sm">{error}</div>}
          </CardContent>
        </Card>

        {/* Transaction list */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-muted-foreground">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center text-muted-foreground">No transactions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-1 text-left">Amount</th>
                      <th className="px-2 py-1 text-left">Date</th>
                      <th className="px-2 py-1 text-left">Description</th>
                      <th className="px-2 py-1 text-left">Category</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx._id} className="border-b hover:bg-muted">
                        <td className="px-2 py-1">₹{tx.amount.toFixed(2)}</td>
                        <td className="px-2 py-1">{format(parseISO(tx.date), "yyyy-MM-dd")}</td>
                        <td className="px-2 py-1">{tx.description}</td>
                        <td className="px-2 py-1">{tx.category}</td>
                        <td className="px-2 py-1 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(tx)} disabled={loading}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(tx._id)} disabled={loading}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryTotals}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {categoryTotals.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
