"use client";

import { cn } from "@/lib/utils";
import { getRiskLabel } from "@/lib/format";

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  minScore?: number;
  riskCategory: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ScoreGauge({
  score,
  maxScore = 850,
  minScore = 300,
  riskCategory,
  size = "md",
  showLabel = true,
}: ScoreGaugeProps) {
  const range = maxScore - minScore;
  const normalized = Math.max(0, Math.min(1, (score - minScore) / range));
  const strokeWidth = size === "sm" ? 8 : size === "md" ? 10 : 14;

  const labelSize = { sm: "text-xs", md: "text-sm", lg: "text-base" };
  const fontSizes = { sm: 28, md: 38, lg: 48 };

  const dimensions = {
    sm: { width: 140, height: 80 },
    md: { width: 200, height: 115 },
    lg: { width: 280, height: 160 },
  };

  const dim = dimensions[size];
  const cx = dim.width / 2;
  const cy = dim.height - 5;
  const r = cx - strokeWidth;

  // Semicircle endpoints: left (cx-r, cy) to right (cx+r, cy)
  const leftX = cx - r;
  const rightX = cx + r;

  // Background: full semicircle from left to right through the top
  const bgArc = `M ${leftX} ${cy} A ${r} ${r} 0 0 1 ${rightX} ${cy}`;

  // Score endpoint on the arc
  // Angle sweeps from π (left) to 0 (right) as score goes 0% to 100%
  const scoreAngle = Math.PI * (1 - normalized);
  const scoreX = cx + r * Math.cos(scoreAngle);
  const scoreY = cy - r * Math.sin(scoreAngle);

  // Score arc: from left to score point, clockwise (sweep=1) through the top
  const scoreArc = normalized > 0.005
    ? `M ${leftX} ${cy} A ${r} ${r} 0 0 1 ${scoreX} ${scoreY}`
    : "";

  const getGaugeColor = () => {
    switch (riskCategory) {
      case "EXCELLENT": return "#059669";
      case "GOOD": return "#0d9488";
      case "FAIR": return "#f59e0b";
      case "MARGINAL": return "#f97316";
      case "HIGH_RISK": return "#ef4444";
      default: return "#94a3b8";
    }
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={dim.width} height={dim.height} viewBox={`0 0 ${dim.width} ${dim.height}`}>
        {/* Background arc */}
        <path
          d={bgArc}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Score arc */}
        {scoreArc && (
          <path
            d={scoreArc}
            fill="none"
            stroke={getGaugeColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        )}
        {/* Score text */}
        <text
          x={cx}
          y={cy - r * 0.3}
          textAnchor="middle"
          fill={getGaugeColor()}
          fontSize={fontSizes[size]}
          fontWeight="bold"
        >
          {score}
        </text>
        {/* Min/Max labels */}
        <text x={leftX} y={cy + 15} fontSize="10" fill="#94a3b8" textAnchor="middle">
          {minScore}
        </text>
        <text x={rightX} y={cy + 15} fontSize="10" fill="#94a3b8" textAnchor="middle">
          {maxScore}
        </text>
      </svg>
      {showLabel && (
        <span
          className={cn(
            "font-semibold mt-1 px-3 py-0.5 rounded-full",
            labelSize[size],
            riskCategory === "EXCELLENT" && "bg-emerald-100 text-emerald-800",
            riskCategory === "GOOD" && "bg-teal-100 text-teal-800",
            riskCategory === "FAIR" && "bg-amber-100 text-amber-800",
            riskCategory === "MARGINAL" && "bg-orange-100 text-orange-800",
            riskCategory === "HIGH_RISK" && "bg-red-100 text-red-800"
          )}
        >
          {getRiskLabel(riskCategory)}
        </span>
      )}
    </div>
  );
}
