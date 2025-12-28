import { useEffect, useMemo, useState } from "react";
import SpendingChart from "./components/SpendingChart.jsx";

const STORAGE_KEY = "expense-tracker:v2";

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { expenses: [], monthlyLimit: 300 };
  try {
    const parsed = JSON.parse(raw);
    return {
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      monthlyLimit: Number.isFinite(parsed.monthlyLimit) ? parsed.monthlyLimit : 300
    };
  } catch {
    return { expenses: [], monthlyLimit: 300 };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatEUR(value) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

// Keep it friendly for typing:
// - allow "" (empty)
// - allow "12", "12.", "12.3", "12.34"
// - accept comma and convert to dot
// - remove all other characters
function sanitizeAmountInput(raw) {
  let s = String(raw ?? "").replace(",", ".");

  // allow empty while user is editing
  if (s === "") return "";

  // remove invalid chars
  s = s.replace(/[^\d.]/g, "");

  // if user starts with ".", convert to "0."
  if (s.startsWith(".")) s = "0" + s;

  // allow only one dot
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    const before = s.slice(0, firstDot + 1);
    const after = s.slice(firstDot + 1).replace(/\./g, "");
    s = before + after;
  }

  // max 2 decimals
  const [intPart, decPart] = s.split(".");
  if (decPart != null) return `${intPart}.${decPart.slice(0, 2)}`;
  return intPart;
}

function toNumberOrNaN(amountString) {
  if (amountString === "" || amountString === "." || amountString === "0.") return NaN;
  return Number(amountString);
}

export default function App() {
  const initial = useMemo(() => loadState(), []);
  const [expenses, setExpenses] = useState(initial.expenses);
  const [monthlyLimit, setMonthlyLimit] = useState(initial.monthlyLimit);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");

  useEffect(() => {
    saveState({ expenses, monthlyLimit });
  }, [expenses, monthlyLimit]);

  const total = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const percent = useMemo(() => {
    if (!monthlyLimit || monthlyLimit <= 0) return 0;
    return Math.min(100, Math.round((total / monthlyLimit) * 100));
  }, [total, monthlyLimit]);

  const addExpense = (e) => {
    e.preventDefault();

    const cleanTitle = title.trim();
    const cleanAmount = sanitizeAmountInput(amount);
    const value = toNumberOrNaN(cleanAmount);

    if (!cleanTitle) return;
    if (!Number.isFinite(value) || value <= 0) return;

    const newExpense = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      amount: Number(value.toFixed(2)),
      category,
      createdAt: new Date().toISOString()
    };

    setExpenses((prev) => [newExpense, ...prev]);
    setTitle("");
    setAmount("");
  };

  const removeExpense = (id) => setExpenses((prev) => prev.filter((e) => e.id !== id));

  const clearAll = () => {
    if (!confirm("Delete all expenses?")) return;
    setExpenses([]);
  };

  return (
    <div className="container">
      <h1>Expense Tracker</h1>
      <p className="muted">LocalStorage persistence + spending limit + chart.</p>

      <div className="card">
        <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
          <div className="total">Total: {formatEUR(total)}</div>

          <div className="row" style={{ alignItems: "center" }}>
            <span className="muted">Monthly limit:</span>
            <input
              value={monthlyLimit}
              onChange={(e) => {
                const cleaned = sanitizeAmountInput(e.target.value);
                const n = Number(cleaned);
                setMonthlyLimit(Number.isFinite(n) ? n : 0);
              }}
              type="number"
              min="0"
              step="1"
              style={{ width: 140 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="muted">Used: {percent}%</div>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              overflow: "hidden",
              marginTop: 6
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${percent}%`,
                background: percent >= 100 ? "#ef4444" : percent >= 80 ? "#f59e0b" : "#22c55e"
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <h3 style={{ margin: "8px 0" }}>Spend by category</h3>
          <SpendingChart expenses={expenses} />
        </div>

        <hr style={{ margin: "16px 0", opacity: 0.15 }} />

        <form onSubmit={addExpense} className="row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g., "Aldi - groceries"'
          />

          <input
            value={amount}
            onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
            onBlur={() => {
              // normalize when leaving field (optional)
              const n = toNumberOrNaN(amount);
              if (Number.isFinite(n)) setAmount(n.toFixed(2));
            }}
            placeholder="Amount (e.g., 20.50)"
            type="text"
            inputMode="decimal"
            aria-label="Amount"
            style={{ width: 180 }}
          />

          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Groceries</option>
            <option>Transport</option>
            <option>Rent</option>
            <option>Utilities</option>
            <option>Shopping</option>
            <option>Entertainment</option>
            <option>Other</option>
          </select>

          <button className="primary" type="submit">
            Add
          </button>

          <button type="button" onClick={clearAll}>
            Clear
          </button>
        </form>

        <div className="list">
          {expenses.length === 0 ? (
            <div className="muted">No expenses yet.</div>
          ) : (
            expenses.map((ex) => (
              <div key={ex.id} className="item">
                <div>
                  <div style={{ fontWeight: 700 }}>{ex.title}</div>
                  <div className="muted">
                    {ex.category} • {new Date(ex.createdAt).toLocaleString("de-DE")}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 800 }}>{formatEUR(ex.amount)}</div>
                  <button onClick={() => removeExpense(ex.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
