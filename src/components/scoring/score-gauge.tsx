"use client";

import { useState, useEffect, useRef } from "react";
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

const RISK_COLORS: Record<string, string> = {
  EXCELLENT: "#15803d",
  GOOD: "#16a34a",
  FAIR: "#f59e0b",
  MARGINAL: "#f97316",
  HIGH_RISK: "#ef4444",
};

const SEGMENT_COLORS = [
  { stop: 0, color: "#ef4444" },      // High Risk
  { stop: 0.27, color: "#f97316" },    // Marginal
  { stop: 0.45, color: "#f59e0b" },    // Fair
  { stop: 0.64, color: "#16a34a" },    // Good
  { stop: 1, color: "#15803d" },       // Excellent
];

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

  const [animatedNormalized, setAnimatedNormalized] = useState(0);
  const [displayScore, setDisplayScore] = useState(minScore);
  const arcRef = useRef<SVGCircleElement>(null);

  // Animate the score number with requestAnimationFrame
  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedNormalized(eased * targetNormalized);
      setDisplayScore(Math.round(minScore + (score - minScore) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [score, minScore, targetNormalized]);

  const dims = {
    sm: { svgSize: 120, stroke: 10, fontSize: 24, labelSize: "text-xs" as const },
    md: { svgSize: 180, stroke: 14, fontSize: 34, labelSize: "text-sm" as const },
    lg: { svgSize: 240, stroke: 18, fontSize: 44, labelSize: "text-base" as const },
  };

  const d = dims[size];
  const center = d.svgSize / 2;
  const radius = center - d.stroke / 2 - 2; // 2px safety margin
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degrees
  const dashArray = `${arcLength} ${circumference}`;
  const trackOffset = 0;
  const scoreOffset = arcLength - animatedNormalized * arcLength;

  const gaugeColor = RISK_COLORS[riskCategory] ?? "#94a3b8";

  // Tick positions for min/max labels
  // 270° arc starts at 135° (bottom-left) and ends at 45° (bottom-right)
  const startAngleDeg = 135;
  const endAngleDeg = 405; // 135 + 270
  const startAngle = (startAngleDeg * Math.PI) / 180;
  const endAngle = (endAngleDeg * Math.PI) / 180;

  const minLabelX = center + (radius + d.stroke / 2 + 10) * Math.cos(startAngle);
  const minLabelY = center + (radius + d.stroke / 2 + 10) * Math.sin(startAngle);
  const maxLabelX = center + (radius + d.stroke / 2 + 10) * Math.cos(endAngle);
  const maxLabelY = center + (radius + d.stroke / 2 + 10) * Math.sin(endAngle);

  // Needle dot position
  const needleAngle = startAngle + animatedNormalized * (endAngle - startAngle);
  const needleX = center + radius * Math.cos(needleAngle);
  const needleY = center + radius * Math.sin(needleAngle);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: d.svgSize, height: d.svgSize }}>
        <svg
          width={d.svgSize}
          height={d.svgSize}
          viewBox={`0 0 ${d.svgSize} ${d.svgSize}`}
        >
          <defs>
            {/* Gradient that follows the arc color segments */}
            <linearGradient id={`gaugeGradient-${size}`} x1="0" y1="1" x2="1" y2="0">
              {SEGMENT_COLORS.map((seg, i) => (
                <stop key={i} offset={`${seg.stop * 100}%`} stopColor={seg.color} stopOpacity={0.15} />
              ))}
            </linearGradient>
          </defs>

          {/* Background track (270° arc) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#gaugeGradient-${size})`}
            strokeWidth={d.stroke}
            strokeDasharray={dashArray}
            strokeDashoffset={trackOffset}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
          />

          {/* Score fill arc */}
          <circle
            ref={arcRef}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={d.stroke}
            strokeDasharray={dashArray}
            strokeDashoffset={scoreOffset}
            strokeLinecap="round"
            transform={`rotate(135 ${center} ${center})`}
          />

          {/* Needle dot */}
          {animatedNormalized > 0.005 && (
            <circle
              cx={needleX}
              cy={needleY}
              r={d.stroke * 0.45}
              fill="white"
              stroke={gaugeColor}
              strokeWidth={2.5}
            />
          )}

          {/* Score number */}
          <text
            x={center}
            y={center - 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={gaugeColor}
            fontSize={d.fontSize}
            fontWeight="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {displayScore}
          </text>

          {/* "out of" label */}
          <text
            x={center}
            y={center + d.fontSize * 0.55}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#94a3b8"
            fontSize={d.fontSize * 0.28}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            out of {maxScore}
          </text>

          {/* Min label */}
          <text
            x={minLabelX}
            y={minLabelY}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#94a3b8"
            fontSize={9}
          >
            {minScore}
          </text>

          {/* Max label */}
          <text
            x={maxLabelX}
            y={maxLabelY}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#94a3b8"
            fontSize={9}
          >
            {maxScore}
          </text>
        </svg>
      </div>
      {showLabel && (
        <span
          className={cn(
            "font-semibold mt-1 px-3 py-0.5 rounded-full",
            d.labelSize,
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
