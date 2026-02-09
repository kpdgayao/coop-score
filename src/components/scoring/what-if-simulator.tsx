"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Trash2, Play, Loader2, Target, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { AILoadingIndicator } from "@/components/ai/ai-loading-indicator";

interface SimulationAction {
  id: string;
  action: string;
  value: string;
  label: string;
}

interface CoachingResponse {
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
}

interface WhatIfSimulatorProps {
  memberId: string;
  currentScore: number;
  riskCategory: string;
}

const presetActions = [
  { label: "Attend 2 more trainings", action: "attend_trainings", defaultValue: "2" },
  { label: "Increase CBU by amount", action: "increase_cbu", defaultValue: "5000" },
  { label: "Join a committee", action: "join_committee", defaultValue: "1" },
  { label: "Attend next GA", action: "attend_ga", defaultValue: "1" },
  { label: "Use coop store services", action: "use_services", defaultValue: "5" },
  { label: "Refer a new member", action: "refer_member", defaultValue: "1" },
];

export function WhatIfSimulator({
  memberId,
  currentScore,
  riskCategory,
}: WhatIfSimulatorProps) {
  const [actions, setActions] = useState<SimulationAction[]>([]);
  const [coaching, setCoaching] = useState<CoachingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addAction = (preset: typeof presetActions[0]) => {
    setActions([
      ...actions,
      { id: Math.random().toString(36).slice(2), action: preset.action, value: preset.defaultValue, label: preset.label },
    ]);
  };

  const removeAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    setCoaching(null);

    // Build simulation results to pass to AI
    const simulationResults = actions.map((a) => {
      const estimatedChange = estimateScoreChange(a.action, a.value);
      return {
        action: a.label + (a.value !== "1" ? ` (${a.value})` : ""),
        projectedScoreChange: estimatedChange,
        newScore: Math.min(850, currentScore + estimatedChange),
      };
    });

    try {
      const res = await fetch("/api/ai/what-if-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, simulationResults }),
      });
      if (!res.ok) throw new Error("AI coaching unavailable");
      const result = await res.json();
      setCoaching(result);
      toast.success("AI coaching generated");
    } catch {
      setError("AI coaching unavailable. Check your API key.");
      toast.error("AI coaching unavailable");
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-brand" />
          What-If Score Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select actions to simulate and get AI-powered coaching on how to improve this member&apos;s credit score.
        </p>

        {/* Preset actions */}
        <div className="flex flex-wrap gap-2">
          {presetActions.map((preset) => (
            <Button
              key={preset.action}
              variant="outline"
              size="sm"
              onClick={() => addAction(preset)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Selected actions */}
        {actions.length > 0 && (
          <div className="space-y-2">
            {actions.map((action) => (
              <div key={action.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                <span className="text-sm flex-1 min-w-0">{action.label}</span>
                <Input
                  value={action.value}
                  onChange={(e) =>
                    setActions(
                      actions.map((a) =>
                        a.id === action.id ? { ...a, value: e.target.value } : a
                      )
                    )
                  }
                  className="w-20 h-10 text-sm shrink-0"
                />
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeAction(action.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button onClick={runSimulation} disabled={loading} className="w-full bg-brand hover:bg-brand-light text-white">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {loading ? "Getting AI Coaching..." : "Run Simulation & Get AI Coaching"}
            </Button>
          </div>
        )}

        {loading && (
          <AILoadingIndicator message="Getting AI coaching recommendations..." />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* AI Coaching Results */}
        {coaching && (
          <div className="space-y-4 pt-4 border-t">
            {/* Coaching Message */}
            <div className="p-4 bg-brand/5 rounded-lg border border-brand/20">
              <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2 text-brand">
                <Sparkles className="h-4 w-4" />
                AI Coach Says
              </h4>
              <p className="text-sm leading-relaxed">{coaching.coaching_message}</p>
            </div>

            {/* Priority Actions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority Actions</Label>
              {coaching.priority_actions.map((pa, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{pa.action}</span>
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 shrink-0">
                      {pa.projected_impact}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {pa.timeline}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {pa.feasibility}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Next Milestone */}
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <Target className="h-4 w-4 text-primary" />
                Next Milestone: {coaching.next_milestone.target_tier}
              </h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold">{coaching.next_milestone.current_score}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-2xl font-bold text-primary">{coaching.next_milestone.target_score}</span>
              </div>
              <ul className="space-y-1">
                {coaching.next_milestone.actions_needed.map((a, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Rough heuristic for estimated score change per action type.
 * Used to provide simulation results to the AI coach.
 */
function estimateScoreChange(action: string, value: string): number {
  const v = parseInt(value) || 1;
  switch (action) {
    case "attend_trainings": return Math.min(v * 8, 25);
    case "increase_cbu": return Math.min(Math.floor(parseInt(value) / 1000) * 5, 30);
    case "join_committee": return 15;
    case "attend_ga": return 10;
    case "use_services": return Math.min(v * 3, 20);
    case "refer_member": return Math.min(v * 5, 15);
    default: return 10;
  }
}
