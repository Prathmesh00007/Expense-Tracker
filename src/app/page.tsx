"use client";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO, addMonths, format as formatDate, startOfMonth, subMonths } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

const RECUR_TYPES = [
  { value: "none", label: "None" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const transactionSchema = z.object({
  amount: z.number().min(0.01, "Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  recurring: z.boolean().optional(),
  recurringType: z.enum(["weekly", "monthly", "yearly"]).nullable().optional(),
  recurringEndDate: z.string().optional(),
  type: z.enum(["expense", "income", "none"]),
});

type Transaction = {
  _id: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  recurring?: boolean;
  recurringType?: "weekly" | "monthly" | "yearly" | null;
  recurringEndDate?: string | null;
  type: "expense" | "income" | "none";
};

type FormData = z.infer<typeof transactionSchema>;

function toCSV(data: any[], columns: string[]): string {
  const header = columns.join(",");
  const rows = data.map(row => columns.map(col => JSON.stringify(row[col] ?? "")).join(","));
  return [header, ...rows].join("\n");
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<{ category: string; month: string; amount: number }[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => format(startOfMonth(new Date()), "yyyy-MM"));

  // Filter state
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterMin, setFilterMin] = useState("");
  const [filterMax, setFilterMax] = useState("");
  const [filterDesc, setFilterDesc] = useState("");
  const [quickSearch, setQuickSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");

  const defaultFormValues: FormData = { amount: 0, date: "", description: "", category: CATEGORIES[0], recurring: false, recurringType: null, recurringEndDate: "", type: "expense" as const };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: defaultFormValues,
  });

  // Filtered transactions (memoized)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Date range
      if (filterStart && tx.date < filterStart) return false;
      if (filterEnd && tx.date > filterEnd) return false;
      // Category
      if (filterCategories.length > 0 && !filterCategories.includes(tx.category)) return false;
      // Amount
      if (filterMin && tx.amount < parseFloat(filterMin)) return false;
      if (filterMax && tx.amount > parseFloat(filterMax)) return false;
      // Description
      if (filterDesc && !tx.description.toLowerCase().includes(filterDesc.toLowerCase())) return false;
      // Quick search (all fields)
      if (quickSearch) {
        const q = quickSearch.toLowerCase();
        if (
          !(
            tx.description.toLowerCase().includes(q) ||
            tx.category.toLowerCase().includes(q) ||
            tx.amount.toString().includes(q) ||
            tx.date.includes(q)
          )
        )
          return false;
      }
      if (filterType && tx.type !== filterType) return false;
      return true;
    });
  }, [transactions, filterStart, filterEnd, filterCategories, filterMin, filterMax, filterDesc, quickSearch, filterType]);

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
      reset(defaultFormValues);
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
    setValue("recurring", !!tx.recurring);
    setValue("recurringType", tx.recurringType ?? null);
    setValue("recurringEndDate", tx.recurringEndDate ? tx.recurringEndDate.slice(0, 10) : "");
    setValue("type", tx.type || "expense");
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

  // All charts and summaries should use filteredTransactions
  const totalIncome = filteredTransactions.filter(tx => tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = filteredTransactions.filter(tx => tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  const netSavings = totalIncome - totalExpenses;
  const categoryTotals = CATEGORIES.map((cat) => ({
    category: cat,
    total: filteredTransactions.filter((tx) => tx.category === cat && tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0),
  })).filter((c) => c.total > 0);
  const mostRecent = filteredTransactions.slice(0, 5);
  const monthlyData = filteredTransactions.reduce<Record<string, number>>((acc, tx) => {
    const month = format(parseISO(tx.date), "yyyy-MM");
    acc[month] = (acc[month] || 0) + tx.amount;
    return acc;
  }, {});
  const chartData = Object.entries(monthlyData).map(([month, total]) => ({
    month,
    total,
  }));
  const savingsByMonth = filteredTransactions.reduce<Record<string, { income: number; expense: number }>>((acc, tx) => {
    const month = format(parseISO(tx.date), "yyyy-MM");
    if (!acc[month]) acc[month] = { income: 0, expense: 0 };
    if (tx.type === "income") acc[month].income += tx.amount;
    else acc[month].expense += tx.amount;
    return acc;
  }, {});
  const savingsChartData = Object.entries(savingsByMonth).map(([month, { income, expense }]) => ({
    month,
    income,
    expense,
    savings: income - expense,
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
    acc[cat] = filteredTransactions.filter((tx) => tx.category === cat && tx.date.startsWith(selectedMonth) && tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  // Smart Insights
  const now = new Date();
  const thisMonth = format(startOfMonth(now), "yyyy-MM");
  const lastMonth = format(startOfMonth(subMonths(now, 1)), "yyyy-MM");
  // Biggest expense category this month
  const biggestCategory = categoryTotals.length > 0 ? categoryTotals.reduce((a, b) => (a.total > b.total ? a : b)).category : null;
  // Month-over-month for each category
  const lastMonthTotals = CATEGORIES.map((cat) => ({
    category: cat,
    total: filteredTransactions.filter((tx) => tx.category === cat && tx.date.startsWith(lastMonth) && tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0),
  }));
  const insights: string[] = [];
  // Category spending change
  for (const cat of CATEGORIES) {
    const thisTotal = categoryTotals.find((c) => c.category === cat)?.total || 0;
    const lastTotal = lastMonthTotals.find((c) => c.category === cat)?.total || 0;
    if (thisTotal > 0 && lastTotal > 0) {
      const change = ((thisTotal - lastTotal) / lastTotal) * 100;
      if (change > 20) insights.push(`You spent ${change.toFixed(0)}% more on ${cat} this month than last month.`);
      else if (change < -20) insights.push(`You spent ${Math.abs(change).toFixed(0)}% less on ${cat} this month than last month.`);
    }
  }
  // Net savings change
  const lastMonthIncome = filteredTransactions.filter((tx) => tx.date.startsWith(lastMonth) && tx.type === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const lastMonthExpense = filteredTransactions.filter((tx) => tx.date.startsWith(lastMonth) && tx.type === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  const lastMonthSavings = lastMonthIncome - lastMonthExpense;
  if (netSavings > 0 && lastMonthSavings > 0) {
    const savingsChange = ((netSavings - lastMonthSavings) / Math.abs(lastMonthSavings)) * 100;
    if (savingsChange > 20) insights.push(`You saved ${savingsChange.toFixed(0)}% more this month than last month.`);
    else if (savingsChange < -20) insights.push(`You saved ${Math.abs(savingsChange).toFixed(0)}% less this month than last month.`);
  }
  // Biggest expense category
  if (biggestCategory) insights.unshift(`Your biggest expense category this month is ${biggestCategory}.`);
  // Suggest budget increase if a category is consistently over budget
  for (const cat of CATEGORIES) {
    const budget = budgetMap[cat] || 0;
    const actual = actualMap[cat] || 0;
    if (budget > 0 && actual > budget) {
      insights.push(`Consider increasing your ${cat} budget. You are consistently over budget.`);
    }
  }

  function handleExportCSV() {
    // Export all transactions
    const txColumns = ["date", "amount", "description", "category"];
    const txCSV = toCSV(filteredTransactions, txColumns);
    downloadCSV("transactions.csv", txCSV);
    // Export budgets for selected month
    if (budgets.length > 0) {
      const budgetColumns = ["category", "month", "amount"];
      const budgetCSV = toCSV(budgets, budgetColumns);
      downloadCSV(`budgets-${selectedMonth}.csv`, budgetCSV);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Personal Finance Visualizer</h1>
      <p className="mb-8 text-lg text-muted-foreground">Track your expenses, visualize your spending, and manage your budget.</p>
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex justify-end mb-2">
          <Button variant="outline" onClick={handleExportCSV}>
            Export to CSV
          </Button>
        </div>
        {/* Dashboard summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{totalIncome.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">₹{totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Net Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netSavings >= 0 ? "text-green-600" : "text-red-600"}`}>₹{netSavings.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Savings chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Net Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={savingsChartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="income" fill="#22c55e" name="Income" />
                  <Bar dataKey="expense" fill="#ef4444" name="Expenses" />
                  <Bar dataKey="savings" fill="#0ea5e9" name="Net Savings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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
              <CardTitle>Smart Insights</CardTitle>
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
                <Select
                  value={watch("category") || CATEGORIES[0]} // fallback to first category
                  onValueChange={(v) => setValue("category", v)}
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.category && <p className="text-destructive text-xs mt-1">{errors.category.message}</p>}
              </div>
              <div>
                <Label htmlFor="recurringType">Recurrence</Label>
                  <Select
                    value={watch("recurringType") ?? ""}
                    onValueChange={(v) => {
                  const type = v === "" ? null : (v as "weekly" | "monthly" | "yearly");
                  setValue("recurringType", type);
                  setValue("recurring", type !== null); // ✅ Set recurring = true if type is not null
                }}
              >
                <SelectTrigger id="recurringType">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {RECUR_TYPES.map((opt) => (
                    <SelectItem key={opt.value ?? "none"} value={opt.value ?? ""}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              </div>
              {watch("recurringType") && (
                <div>
                  <Label htmlFor="recurringEndDate">End Date (optional)</Label>
                  <Input type="date" id="recurringEndDate" {...register("recurringEndDate")} />
                </div>
              )}
              <div>
                <Label>Type</Label>
                <Select value={watch("type")} onValueChange={v => setValue("type", v as "expense" | "income")}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="md:col-span-4 w-full" disabled={loading}>
                {editId ? "Update" : "Add"} Transaction
              </Button>
              {editId && (
                <Button type="button" variant="secondary" className="md:col-span-4 w-full" onClick={() => { reset(defaultFormValues); setEditId(null); }}>
                  Cancel Edit
                </Button>
              )}
            </form>
            {error && <div className="text-destructive mt-2 text-sm">{error}</div>}
          </CardContent>
        </Card>

        {/* Filters & Search */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label htmlFor="quickSearch">Quick Search</Label>
                <Input id="quickSearch" value={quickSearch} onChange={e => setQuickSearch(e.target.value)} placeholder="Search all fields..." className="w-40" />
              </div>
              <div>
                <Label htmlFor="filterStart">Start Date</Label>
                <Input id="filterStart" type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="w-36" />
              </div>
              <div>
                <Label htmlFor="filterEnd">End Date</Label>
                <Input id="filterEnd" type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="w-36" />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="mt-6">Categories</Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="flex flex-col gap-2">
                    {CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center gap-2">
                        <Checkbox checked={filterCategories.includes(cat)} onCheckedChange={checked => {
                          setFilterCategories(checked ? [...filterCategories, cat] : filterCategories.filter(c => c !== cat));
                        }} />
                        {cat}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <div>
                <Label htmlFor="filterMin">Min Amount</Label>
                <Input id="filterMin" type="number" value={filterMin} onChange={e => setFilterMin(e.target.value)} className="w-24" />
              </div>
              <div>
                <Label htmlFor="filterMax">Max Amount</Label>
                <Input id="filterMax" type="number" value={filterMax} onChange={e => setFilterMax(e.target.value)} className="w-24" />
              </div>
              <div>
                <Label htmlFor="filterDesc">Description</Label>
                <Input id="filterDesc" value={filterDesc} onChange={e => setFilterDesc(e.target.value)} className="w-40" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">All</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="secondary" className="mt-6" onClick={() => {
                setFilterStart(""); setFilterEnd(""); setFilterCategories([]); setFilterMin(""); setFilterMax(""); setFilterDesc(""); setQuickSearch("");
              }}>Clear</Button>
            </div>
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
            ) : filteredTransactions.length === 0 ? (
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
                      <th className="px-2 py-1 text-left">Recurrence</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx._id} className="border-b hover:bg-muted">
                        <td className="px-2 py-1">₹{tx.amount.toFixed(2)}</td>
                        <td className="px-2 py-1">{format(parseISO(tx.date), "yyyy-MM-dd")}</td>
                        <td className="px-2 py-1">{tx.description}</td>
                        <td className="px-2 py-1">{tx.category}</td>
                        <td className="px-2 py-1 flex gap-2 items-center">
                          {tx.recurring && tx.recurringType && (
                            <Badge variant="secondary">Recurring: {tx.recurringType.charAt(0).toUpperCase() + tx.recurringType.slice(1)}</Badge>
                          )}
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
                  <BarChart data={categoryTotals} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <XAxis dataKey="total" />
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
