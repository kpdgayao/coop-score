"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface DimensionData {
  dimension: string;
  score: number;
  fullMark: number;
}

interface DimensionRadarProps {
  dimensions: DimensionData[];
}

export function DimensionRadar({ dimensions }: DimensionRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={dimensions} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#0d9488"
          fill="#0d9488"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value) => [`${value}/100`, "Score"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
