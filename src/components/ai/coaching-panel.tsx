"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target, ArrowUp, Clock, CheckCircle2 } from "lucide-react";

interface CoachingPanelProps {
  coaching: {
    coaching_message: string;
    priority_actions: Array<{
      action: string;
      projected_impact: string;
      timeline: string;
      feasibility: string;
    }>;
    next_milestone: {
      target_tier: string;
      current_score: number;
      target_score: number;
      actions_needed: string[];
    };
  } | null;
}

export function CoachingPanel({ coaching }: CoachingPanelProps) {
  if (!coaching) return null;

  const c = coaching;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-teal" />
          AI Score Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coaching message */}
        <p className="text-sm leading-relaxed">{c.coaching_message}</p>

        {/* Priority Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Priority Actions</h4>
          {c.priority_actions.map((action, i) => (
            <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />
                  {action.action}
                </span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {action.projected_impact}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {action.timeline}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Feasibility: {action.feasibility}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Next Milestone */}
        <div className="p-3 bg-teal/5 border border-teal/20 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-teal" />
            <h4 className="text-sm font-medium">
              Next Milestone: {c.next_milestone.target_tier}
            </h4>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {c.next_milestone.current_score}
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-teal rounded-full transition-all"
                style={{
                  width: `${((c.next_milestone.current_score - 300) / (c.next_milestone.target_score - 300)) * 100}%`,
                }}
              />
            </div>
            <span className="font-medium">{c.next_milestone.target_score}</span>
          </div>
          <ul className="space-y-0.5">
            {c.next_milestone.actions_needed.map((a, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                • {a}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
