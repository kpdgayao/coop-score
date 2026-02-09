"use client";

import { useState, useEffect } from "react";
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
  const targetNormalized = Math.max(0, Math.min(1, (score - minScore) / range));
  const strokeWidth = size === "sm" ? 8 : size === "md" ? 10 : 14;

  // Animation state
  const [animatedNormalized, setAnimatedNormalized] = useState(0);
  const [displayScore, setDisplayScore] = useState(minScore);

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();
    const startNorm = 0;
    const startScore = minScore;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedNormalized(startNorm + (targetNormalized - startNorm) * eased);
      setDisplayScore(Math.round(startScore + (score - startScore) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [score, minScore, targetNormalized]);

  const labelSize = { sm: "text-xs", md: "text-sm", lg: "text-base" };
  const fontSizes = { sm: 28, md: 38, lg: 48 };

  const dimensions = {
    sm: { width: 140, height: 95 },
    md: { width: 200, height: 130 },
    lg: { width: 280, height: 180 },
  };

  const dim = dimensions[size];
  // Needle dot dimensions
  const dotRadius = strokeWidth * 0.6;
  const dotBorder = 2;
  // Pad the viewBox to contain the needle dot at any arc position
  const pad = Math.ceil(dotRadius + dotBorder);

  // Drawing coordinates use the padded coordinate space
  const cx = dim.width / 2 + pad;
  const cy = dim.height - 18 + pad;
  const r = dim.width / 2 - strokeWidth / 2;

  const leftX = cx - r;
  const rightX = cx + r;

  // Padded viewBox: content draws in a larger coordinate space,
  // mapped to the same display size — prevents any overflow
  const vbW = dim.width + pad * 2;
  const vbH = dim.height + pad * 2;

  // Segment boundaries (normalized: 0=300, 1=850)
  const segments = [
    { end: (449 - minScore) / range, color: "#ef4444" },   // High Risk: red
    { end: (549 - minScore) / range, color: "#f97316" },   // Marginal: orange
    { end: (649 - minScore) / range, color: "#f59e0b" },   // Fair: amber
    { end: (749 - minScore) / range, color: "#16a34a" },   // Good: green
    { end: 1, color: "#15803d" },                           // Excellent: emerald
  ];

  // Generate segment arcs
  const segmentArcs = segments.map((seg, i) => {
    const startNorm = i === 0 ? 0 : segments[i - 1].end;
    const endNorm = seg.end;
    const startAngle = Math.PI * (1 - startNorm);
    const endAngle = Math.PI * (1 - endNorm);
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy - r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy - r * Math.sin(endAngle);
    const largeArc = endNorm - startNorm > 0.5 ? 1 : 0;
    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      color: seg.color,
    };
  });

  // Score endpoint
  const scoreAngle = Math.PI * (1 - animatedNormalized);
  const scoreX = cx + r * Math.cos(scoreAngle);
  const scoreY = cy - r * Math.sin(scoreAngle);

  const scoreArc = animatedNormalized > 0.005
    ? `M ${leftX} ${cy} A ${r} ${r} 0 ${animatedNormalized > 0.5 ? 1 : 0} 1 ${scoreX} ${scoreY}`
    : "";

  const getGaugeColor = () => {
    switch (riskCategory) {
      case "EXCELLENT": return "#15803d";
      case "GOOD": return "#16a34a";
      case "FAIR": return "#f59e0b";
      case "MARGINAL": return "#f97316";
      case "HIGH_RISK": return "#ef4444";
      default: return "#94a3b8";
    }
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={dim.width} height={dim.height} viewBox={`0 0 ${vbW} ${vbH}`}>
        {/* Background colored segments — butt caps to avoid tangent overflow */}
        {segmentArcs.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            opacity={0.15}
          />
        ))}
        {/* Round caps for background track endpoints (circles, not linecaps) */}
        <circle cx={leftX} cy={cy} r={strokeWidth / 2} fill={segments[0].color} opacity={0.15} />
        <circle cx={rightX} cy={cy} r={strokeWidth / 2} fill={segments[segments.length - 1].color} opacity={0.15} />

        {/* Score arc — butt cap, no tangent-dependent overflow */}
        {scoreArc && (
          <path
            d={scoreArc}
            fill="none"
            stroke={getGaugeColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
        )}
        {/* Round start cap for score arc */}
        {animatedNormalized > 0.005 && (
          <circle cx={leftX} cy={cy} r={strokeWidth / 2} fill={getGaugeColor()} />
        )}
        {/* Needle dot at score endpoint */}
        {animatedNormalized > 0.005 && (
          <circle
            cx={scoreX}
            cy={scoreY}
            r={dotRadius}
            fill={getGaugeColor()}
            stroke="white"
            strokeWidth={dotBorder}
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
          {displayScore}
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
            riskCategory === "GOOD" && "bg-green-100 text-green-800",
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
