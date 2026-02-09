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
  const normalized = (score - minScore) / range;
  const angle = normalized * 180; // 0 to 180 degrees for semicircle
  const strokeWidth = size === "sm" ? 8 : size === "md" ? 10 : 14;

  const dimensions = {
    sm: { width: 140, height: 80, fontSize: "text-2xl", labelSize: "text-xs" },
    md: { width: 200, height: 110, fontSize: "text-4xl", labelSize: "text-sm" },
    lg: { width: 280, height: 155, fontSize: "text-5xl", labelSize: "text-base" },
  };

  const dim = dimensions[size];
  const cx = dim.width / 2;
  const cy = dim.height - 5;
  const radius = cx - strokeWidth;

  // Arc path for the background
  const bgArc = describeArc(cx, cy, radius, 180, 360);
  // Arc path for the score fill
  const scoreArc = describeArc(cx, cy, radius, 180, 180 + angle);

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
        {/* Color gradient segments */}
        <defs>
          <linearGradient id={`gauge-gradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        {/* Score arc */}
        <path
          d={scoreArc}
          fill="none"
          stroke={getGaugeColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        {/* Score text */}
        <text
          x={cx}
          y={cy - 15}
          textAnchor="middle"
          className={cn(dim.fontSize, "font-bold")}
          fill={getGaugeColor()}
          fontSize={size === "sm" ? 28 : size === "md" ? 38 : 48}
          fontWeight="bold"
        >
          {score}
        </text>
        {/* Min/Max labels */}
        <text x={strokeWidth} y={cy + 15} fontSize="10" fill="#94a3b8">
          {minScore}
        </text>
        <text x={dim.width - strokeWidth} y={cy + 15} fontSize="10" fill="#94a3b8" textAnchor="end">
          {maxScore}
        </text>
      </svg>
      {showLabel && (
        <span
          className={cn(
            "font-semibold mt-1 px-3 py-0.5 rounded-full",
            dim.labelSize,
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

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
