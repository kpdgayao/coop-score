"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Trash2, Play } from "lucide-react";

interface SimulationAction {
  id: string;
  action: string;
  value: string;
}

interface SimulationResult {
  action: string;
  projectedScoreChange: number;
  newScore: number;
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
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const addAction = (preset: typeof presetActions[0]) => {
    setActions([
      ...actions,
      { id: Math.random().toString(36).slice(2), action: preset.label, value: preset.defaultValue },
    ]);
  };

  const removeAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const runSimulation = async () => {
    setLoading(true);
    // Simulated results for now
    const simResults: SimulationResult[] = actions.map((a) => ({
      action: a.action,
      projectedScoreChange: Math.floor(Math.random() * 30) + 5,
      newScore: Math.min(850, currentScore + Math.floor(Math.random() * 30) + 5),
    }));
    setResults(simResults);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-teal" />
          What-If Score Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Simulate how different actions could affect this member&apos;s credit score.
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
                <span className="text-sm flex-1">{action.action}</span>
                <Input
                  value={action.value}
                  onChange={(e) =>
                    setActions(
                      actions.map((a) =>
                        a.id === action.id ? { ...a, value: e.target.value } : a
                      )
                    )
                  }
                  className="w-20 h-8 text-sm"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeAction(action.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            <Button onClick={runSimulation} disabled={loading} className="w-full bg-teal hover:bg-teal-light text-white">
              <Play className="h-4 w-4 mr-2" />
              {loading ? "Simulating..." : "Run Simulation"}
            </Button>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm font-medium">Projected Results</Label>
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                <span className="text-sm">{r.action}</span>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                  +{r.projectedScoreChange} pts → {r.newScore}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
