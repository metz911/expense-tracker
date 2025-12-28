import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  "#2f6fed",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#e11d48"
];

export default function SpendingChart({ expenses }) {
  const byCategory = useMemo(() => {
    const map = new Map();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const data = useMemo(() => {
    return {
      labels: byCategory.map((x) => x.category),
      datasets: [
        {
          label: "Spend (€)",
          data: byCategory.map((x) => Number(x.total.toFixed(2))),
          backgroundColor: byCategory.map((_, i) => COLORS[i % COLORS.length]),
          borderWidth: 0
        }
      ]
    };
  }, [byCategory]);

  if (expenses.length === 0) return <div className="muted">Chart will appear after you add expenses.</div>;

  return (
    <div style={{ height: 260 }}>
      <Doughnut data={data} options={{ responsive: true, maintainAspectRatio: false }} />
    </div>
  );
}
