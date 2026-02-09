"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ScoreDistributionProps {
  data: Array<{ category: string; count: number }>;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  EXCELLENT: { label: "Excellent", color: "#15803d" },
  GOOD: { label: "Good", color: "#16a34a" },
  FAIR: { label: "Fair", color: "#f59e0b" },
  MARGINAL: { label: "Marginal", color: "#f97316" },
  HIGH_RISK: { label: "High Risk", color: "#ef4444" },
};

export function ScoreDistributionChart({ data }: ScoreDistributionProps) {
  const chartData = data.map((d) => ({
    name: CATEGORY_CONFIG[d.category]?.label ?? d.category,
    count: d.count,
    color: CATEGORY_CONFIG[d.category]?.color ?? "#94a3b8",
  }));

  const totalScored = data.reduce((sum, d) => sum + d.count, 0);

  if (totalScored === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No credit scores computed yet. Run batch scoring to see the distribution.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value) => [`${value} members`, "Count"]}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
