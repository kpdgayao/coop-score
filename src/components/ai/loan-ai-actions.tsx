"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { AILoadingIndicator } from "@/components/ai/ai-loading-indicator";
import { NarrativeAssessment } from "@/components/ai/narrative-assessment";
import { InterviewChat } from "@/components/ai/interview-chat";

interface NarrativeData {
  score: number;
  risk_level: string;
  flags: string[];
  reasoning: string;
  purpose_category: string;
  alignment_with_profile: string;
}

interface LoanAIActionsProps {
  loanId: string;
  memberId: string;
  memberName: string;
  existingNarrative: NarrativeData | null;
  conductedById: string;
}

export function LoanAIActions({
  loanId,
  memberId,
  memberName,
  existingNarrative,
  conductedById,
}: LoanAIActionsProps) {
  const [narrative, setNarrative] = useState<NarrativeData | null>(existingNarrative);
  const [analyzingNarrative, setAnalyzingNarrative] = useState(false);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const [showInterview, setShowInterview] = useState(false);

  const analyzeNarrative = async () => {
    setAnalyzingNarrative(true);
    setNarrativeError(null);
    try {
      const res = await fetch("/api/ai/narrative-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId }),
      });
      if (!res.ok) throw new Error("AI analysis failed");
      const result = await res.json();
      setNarrative(result);
      toast.success("AI narrative analysis complete");
    } catch {
      setNarrativeError("Failed to analyze narrative. Check your API key.");
      toast.error("AI narrative analysis failed");
    }
    setAnalyzingNarrative(false);
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={analyzeNarrative}
          disabled={analyzingNarrative}
          variant="outline"
          className="border-brand text-brand hover:bg-brand/10"
        >
          {analyzingNarrative ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Brain className="h-4 w-4 mr-2" />
          )}
          {analyzingNarrative ? "Analyzing..." : narrative ? "Re-analyze Narrative" : "AI Narrative Analysis"}
        </Button>
        <Button
          onClick={() => setShowInterview(!showInterview)}
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {showInterview ? "Hide Interview" : "Start Loan Interview"}
        </Button>
      </div>

      {analyzingNarrative && (
        <AILoadingIndicator message="Analyzing loan narrative..." />
      )}
      {narrativeError && (
        <p className="text-sm text-red-600">{narrativeError}</p>
      )}

      {/* Narrative Assessment Display */}
      <NarrativeAssessment assessment={narrative} />

      {/* Interview Chat */}
      {showInterview && (
        <InterviewChat
          loanId={loanId}
          memberId={memberId}
          memberName={memberName}
        />
      )}
    </div>
  );
}
