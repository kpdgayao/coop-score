"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatShortDate } from "@/lib/format";

interface ScoreHistoryPoint {
  date: string;
  score: number;
}

interface ScoreHistoryProps {
  data: ScoreHistoryPoint[];
}

export function ScoreHistory({ data }: ScoreHistoryProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={(val) => formatShortDate(val)}
        />
        <YAxis
          domain={[300, 850]}
          tick={{ fontSize: 11, fill: "#64748b" }}
          ticks={[300, 450, 550, 650, 750, 850]}
        />
        {/* Tier boundaries */}
        <ReferenceLine y={750} stroke="#059669" strokeDasharray="3 3" strokeOpacity={0.5} />
        <ReferenceLine y={650} stroke="#0d9488" strokeDasharray="3 3" strokeOpacity={0.5} />
        <ReferenceLine y={550} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
        <ReferenceLine y={450} stroke="#f97316" strokeDasharray="3 3" strokeOpacity={0.5} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelFormatter={(val) => formatShortDate(val as string)}
          formatter={(value) => [`${value}`, "Score"]}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#0d9488"
          strokeWidth={2.5}
          dot={{ fill: "#0d9488", r: 4 }}
          activeDot={{ r: 6, fill: "#0d9488" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
