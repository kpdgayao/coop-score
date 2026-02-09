"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface NarrativeAssessmentProps {
  assessment: {
    score: number;
    risk_level: string;
    flags: string[];
    reasoning: string;
    purpose_category: string;
    alignment_with_profile: string;
  } | null;
}

export function NarrativeAssessment({ assessment }: NarrativeAssessmentProps) {
  if (!assessment) return null;

  const a = assessment;

  const riskColor = {
    low: "bg-emerald-100 text-emerald-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-red-100 text-red-800",
  }[a.risk_level] || "bg-muted text-muted-foreground";

  const alignmentColor = {
    strong: "text-emerald-600",
    moderate: "text-teal-600",
    weak: "text-amber-600",
    misaligned: "text-red-600",
  }[a.alignment_with_profile] || "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-teal" />
            AI Narrative Assessment
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{a.purpose_category}</Badge>
            <Badge className={riskColor}>{a.risk_level.toUpperCase()} RISK</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Narrative Score</span>
            <span className="font-medium">{a.score}/100</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${a.score}%`,
                backgroundColor: a.score >= 70 ? "#059669" : a.score >= 40 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
        </div>

        {/* Profile alignment */}
        <div className="flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Profile Alignment:</span>
          <span className={`font-medium ${alignmentColor}`}>
            {a.alignment_with_profile.charAt(0).toUpperCase() + a.alignment_with_profile.slice(1)}
          </span>
        </div>

        {/* Reasoning */}
        <p className="text-sm leading-relaxed">{a.reasoning}</p>

        {/* Flags */}
        {a.flags.length > 0 && (
          <div className="space-y-1.5 p-3 bg-amber-50 rounded-lg">
            <h4 className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Red Flags
            </h4>
            {a.flags.map((flag, i) => (
              <p key={i} className="text-sm text-amber-700 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {flag}
              </p>
            ))}
          </div>
        )}

        {a.flags.length === 0 && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            No red flags detected
          </div>
        )}
      </CardContent>
    </Card>
  );
}
