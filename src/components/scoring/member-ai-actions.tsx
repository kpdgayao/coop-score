"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Brain, Loader2, RefreshCw } from "lucide-react";
import { AICreditMemo } from "@/components/scoring/ai-credit-memo";
import { DimensionRadar } from "@/components/scoring/dimension-radar";
import { ScoreHistory } from "@/components/scoring/score-history";
import { WhatIfSimulator } from "@/components/scoring/what-if-simulator";
import { ScoreGauge } from "@/components/scoring/score-gauge";

interface DimensionScoreData {
  dimension: string;
  score: number;
  weight: number;
  weightedScore: number;
}

interface CreditScoreData {
  id: string;
  totalScore: number;
  riskCategory: string;
  scoringPathway: string;
  scoreDate: string;
  dimensionScores: DimensionScoreData[];
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

interface MemberAIActionsProps {
  memberId: string;
  memberName: string;
  latestScore: CreditScoreData | null;
  scoreHistory: Array<{
    id: string;
    totalScore: number;
    riskCategory: string;
    scoreDate: string;
  }>;
}

export function MemberAIActions({
  memberId,
  memberName,
  latestScore: initialScore,
  scoreHistory: initialHistory,
}: MemberAIActionsProps) {
  const [latestScore, setLatestScore] = useState(initialScore);
  const [scoreHistory, setScoreHistory] = useState(initialHistory);
  const [recommendations, setRecommendations] = useState(initialScore?.recommendations ?? null);
  const [computingScore, setComputingScore] = useState(false);
  const [generatingMemo, setGeneratingMemo] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [memoError, setMemoError] = useState<string | null>(null);

  const computeScore = async () => {
    setComputingScore(true);
    setScoreError(null);
    try {
      const res = await fetch("/api/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error("Failed to compute score");
      const result = await res.json();

      const newScore: CreditScoreData = {
        id: result.memberId + "-" + Date.now(),
        totalScore: result.totalScore,
        riskCategory: result.riskCategory,
        scoringPathway: result.scoringPathway,
        scoreDate: result.computedAt,
        dimensionScores: result.dimensions,
        recommendations: null,
      };
      setLatestScore(newScore);
      setRecommendations(null);
      setScoreHistory((prev) => [
        { id: newScore.id, totalScore: newScore.totalScore, riskCategory: newScore.riskCategory, scoreDate: newScore.scoreDate },
        ...prev,
      ]);
    } catch {
      setScoreError("Failed to compute score. Please try again.");
    }
    setComputingScore(false);
  };

  const generateMemo = async () => {
    if (!latestScore?.id) return;
    setGeneratingMemo(true);
    setMemoError(null);
    try {
      // Need the actual DB credit score ID - fetch from history
      const scoresRes = await fetch(`/api/scoring?memberId=${memberId}`);
      if (!scoresRes.ok) throw new Error("Failed to fetch scores");
      const scores = await scoresRes.json();
      const dbScoreId = scores[0]?.id;
      if (!dbScoreId) throw new Error("No score found");

      const res = await fetch("/api/ai/score-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditScoreId: dbScoreId }),
      });
      if (!res.ok) throw new Error("AI service unavailable");
      const result = await res.json();
      setRecommendations(result);
    } catch {
      setMemoError("AI memo generation failed. Check your API key.");
    }
    setGeneratingMemo(false);
  };

  return (
    <div className="space-y-6">
      {/* Score Display + Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={computeScore}
          disabled={computingScore}
          className="bg-primary hover:bg-primary/90"
        >
          {computingScore ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4 mr-2" />
          )}
          {computingScore ? "Computing..." : "Compute Score"}
        </Button>
        {latestScore && (
          <Button
            onClick={generateMemo}
            disabled={generatingMemo}
            variant="outline"
            className="border-brand text-brand hover:bg-brand/10"
          >
            {generatingMemo ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            {generatingMemo ? "Generating AI Memo..." : "Generate AI Credit Memo"}
          </Button>
        )}
      </div>

      {scoreError && (
        <p className="text-sm text-red-600">{scoreError}</p>
      )}
      {memoError && (
        <p className="text-sm text-red-600">{memoError}</p>
      )}

      {latestScore && (
        <>
          {/* Score Gauge + Dimension Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Current Score</CardTitle>
                  <Badge variant="outline">
                    {latestScore.scoringPathway === "THIN_FILE" ? "Thin File" : "Standard"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ScoreGauge
                  score={latestScore.totalScore}
                  riskCategory={latestScore.riskCategory}
                  size="lg"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dimension Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {latestScore.dimensionScores.length > 0 ? (
                  <DimensionRadar dimensions={latestScore.dimensionScores.map((d) => ({
                    dimension: d.dimension.replace(/([A-Z])/g, " $1").trim(),
                    score: d.score,
                    fullMark: 100,
                  }))} />
                ) : (
                  <p className="text-sm text-muted-foreground">No dimension data available.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dimension Score Bars */}
          <Card>
            <CardHeader>
              <CardTitle>Dimension Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {latestScore.dimensionScores.map((dim) => (
                  <div key={dim.dimension}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{dim.dimension}</span>
                      <span className="font-medium">
                        {dim.score.toFixed(0)} / 100{" "}
                        <span className="text-muted-foreground">({dim.weight}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${dim.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Credit Memo */}
          <AICreditMemo recommendations={recommendations} />

          {/* Score History */}
          {scoreHistory.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Score History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScoreHistory
                  data={scoreHistory.map((s) => ({
                    date: s.scoreDate,
                    score: s.totalScore,
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {/* What-If Simulator */}
          <WhatIfSimulator
            memberId={memberId}
            currentScore={latestScore.totalScore}
            riskCategory={latestScore.riskCategory}
          />
        </>
      )}
    </div>
  );
}
