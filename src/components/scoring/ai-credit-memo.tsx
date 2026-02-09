"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ThumbsUp, AlertTriangle, Lightbulb, CheckCircle } from "lucide-react";

interface CreditMemoProps {
  recommendations: {
    narrative: string;
    strengths: string[];
    concerns: string[];
    recommendation: string;
    suggested_max_amount: number;
    conditions: string[];
    improvement_tips: string[];
  } | null;
}

export function AICreditMemo({ recommendations }: CreditMemoProps) {
  if (!recommendations) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <Brain className="h-5 w-5 mr-2 opacity-50" />
          <span className="text-sm">AI credit memo not yet generated</span>
        </CardContent>
      </Card>
    );
  }

  const r = recommendations;

  const getRecommendationColor = () => {
    switch (r.recommendation) {
      case "approve": return "bg-emerald-100 text-emerald-800";
      case "approve_with_conditions": return "bg-teal-100 text-teal-800";
      case "review": return "bg-amber-100 text-amber-800";
      case "decline": return "bg-red-100 text-red-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-teal" />
            AI Credit Assessment
          </CardTitle>
          <Badge className={getRecommendationColor()}>
            {r.recommendation.replace(/_/g, " ").toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Narrative */}
        <p className="text-sm leading-relaxed">{r.narrative}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5 text-emerald-700">
              <ThumbsUp className="h-4 w-4" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {r.strengths.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Concerns */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Concerns
            </h4>
            <ul className="space-y-1">
              {r.concerns.map((c, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Conditions */}
        {r.conditions.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-lg space-y-1">
            <h4 className="text-sm font-medium text-amber-800">Conditions</h4>
            <ul className="space-y-0.5">
              {r.conditions.map((c, i) => (
                <li key={i} className="text-sm text-amber-700">• {c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvement Tips */}
        {r.improvement_tips.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-teal" />
              How to Improve
            </h4>
            <ul className="space-y-1">
              {r.improvement_tips.map((t, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {i + 1}. {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Amount */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Suggested Max Loan Amount</span>
          <span className="font-semibold text-primary">
            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(r.suggested_max_amount)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
