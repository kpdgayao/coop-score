"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, Send, CheckCircle, Loader2, Globe,
  Square, ClipboardCheck, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
}

interface InterviewAssessment {
  overall_score: number;
  financial_literacy_score: number;
  business_viability_score: number;
  coherence_score: number;
  risk_flags: string[];
  summary: string;
  recommendation: string;
}

interface InterviewChatProps {
  loanId: string;
  memberId: string;
  memberName: string;
  interviewId?: string;
}

type InterviewLanguage = "english" | "bisaya" | "filipino";

const LANGUAGE_OPTIONS: { value: InterviewLanguage; label: string; description: string }[] = [
  { value: "english", label: "English", description: "Conduct interview in English" },
  { value: "bisaya", label: "Bisaya", description: "Bisaya nga interview (CDO style)" },
  { value: "filipino", label: "Filipino", description: "Filipino / Tagalog interview" },
];

const REQUIRED_TOPICS = [
  { id: "business_plan", label: "Business Plan" },
  { id: "loan_terms_understanding", label: "Loan Terms" },
  { id: "household_finances", label: "Household Finances" },
  { id: "purpose_feasibility", label: "Purpose Feasibility" },
  { id: "cooperative_obligations", label: "Coop Obligations" },
];

export function InterviewChat({
  loanId,
  memberId,
  memberName,
  interviewId: initialInterviewId,
}: InterviewChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [interviewId, setInterviewId] = useState(initialInterviewId);
  const [topicsCovered, setTopicsCovered] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [started, setStarted] = useState(false);
  const [language, setLanguage] = useState<InterviewLanguage>("english");
  const [completing, setCompleting] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [assessment, setAssessment] = useState<InterviewAssessment | null>(null);
  const [assessError, setAssessError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, assessment]);

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/loan-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, action: "start", language }),
      });
      const data = await res.json();
      setInterviewId(data.interviewId);
      setMessages([
        {
          role: "assistant",
          content: data.firstMessage,
          timestamp: new Date(),
        },
      ]);
      setStarted(true);
    } catch {
      const fallbackGreetings: Record<InterviewLanguage, string> = {
        english: `Good day! I'm here to have a friendly conversation with you about your loan application. This will help our credit committee better understand your needs. Let's start — could you tell me about your business or livelihood?`,
        bisaya: `Maayong adlaw! Naa ko diri para makig-istorya nimo bahin sa imong loan application. Kini makatabang sa atong credit committee nga mas masabtan ang imong panginahanglan. Magsugod ta — mahimo ba nimong isulti nako ang imong negosyo o panginabuhian?`,
        filipino: `Magandang araw! Nandito ako para makausap ka tungkol sa iyong loan application. Ito ay makakatulong sa ating credit committee na mas maintindihan ang iyong pangangailangan. Magsimula tayo — maaari mo bang ikuwento sa akin ang iyong negosyo o hanapbuhay?`,
      };
      setMessages([
        {
          role: "assistant",
          content: fallbackGreetings[language],
          timestamp: new Date(),
        },
      ]);
      setStarted(true);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/loan-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          action: "continue",
          message: userMsg.content,
        }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.aiMessage, timestamp: new Date() },
      ]);
      setTopicsCovered(data.topicsCovered || []);
      if (data.isComplete) setIsComplete(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I encountered a technical issue. Could you please repeat your answer?",
          timestamp: new Date(),
        },
      ]);
    }

    setLoading(false);
  };

  const endInterview = async () => {
    if (!interviewId) return;
    setCompleting(true);
    try {
      const res = await fetch("/api/ai/loan-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, action: "complete" }),
      });
      if (res.ok) {
        setIsComplete(true);
      }
    } catch {
      // ignore
    }
    setCompleting(false);
  };

  const generateAssessment = async () => {
    if (!interviewId) return;
    setAssessing(true);
    setAssessError(null);
    try {
      const res = await fetch("/api/ai/loan-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, action: "assess" }),
      });
      if (!res.ok) throw new Error("Assessment failed");
      const data = await res.json();
      setAssessment(data);
    } catch {
      setAssessError("Failed to generate assessment. Please try again.");
    }
    setAssessing(false);
  };

  const selectedLang = LANGUAGE_OPTIONS.find((l) => l.value === language)!;

  // Show end button after at least 3 exchanges (6 messages)
  const canEnd = started && !isComplete && !loading && messages.length >= 4;

  return (
    <Card className="flex flex-col h-[calc(100vh-10rem)] max-h-[700px] min-h-[400px]">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base min-w-0">
            <MessageCircle className="h-5 w-5 text-brand shrink-0" />
            <span className="truncate">Loan Interview — {memberName}</span>
          </CardTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            {started && (
              <Badge
                variant="outline"
                className="text-[11px] gap-1"
              >
                <Globe className="h-3 w-3" />
                {selectedLang.label}
              </Badge>
            )}
            {started && (
              <Badge variant={isComplete ? "default" : "secondary"}>
                {isComplete ? "Complete" : "In Progress"}
              </Badge>
            )}
          </div>
        </div>
        {/* Topics progress */}
        {started && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {REQUIRED_TOPICS.map((topic) => (
              <Badge
                key={topic.id}
                variant="outline"
                className={cn(
                  "text-[11px]",
                  topicsCovered.includes(topic.id)
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "text-muted-foreground"
                )}
              >
                {topicsCovered.includes(topic.id) && (
                  <CheckCircle className="h-3 w-3 mr-0.5" />
                )}
                {topic.label}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4" ref={scrollRef}>
          {!started ? (
            <div className="flex flex-col items-center py-6 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm mb-4">
                Start a guided loan interview with the applicant.
                <br />
                The AI will cover 5 required topics in depth for assessment.
              </p>

              {/* Language Picker */}
              <div className="w-full max-w-sm mb-4">
                <p className="text-sm font-medium mb-2">Interview Language</p>
                <div className="grid gap-1.5">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => setLanguage(lang.value)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors min-h-[40px]",
                        language === lang.value
                          ? "border-brand bg-brand/5 ring-1 ring-brand/20"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                          language === lang.value
                            ? "border-brand"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {language === lang.value && (
                          <div className="h-2 w-2 rounded-full bg-brand" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium">{lang.label}</span>
                        <p className="text-xs text-muted-foreground">
                          {lang.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={startInterview}
                disabled={loading}
                className="bg-brand hover:bg-brand-light text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-2" />
                )}
                Start Interview
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Assessment Results */}
              {assessment && (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3 mt-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-brand" />
                    Interview Assessment
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <ScoreBar label="Overall" score={assessment.overall_score} />
                    <ScoreBar label="Financial Literacy" score={assessment.financial_literacy_score} />
                    <ScoreBar label="Business Viability" score={assessment.business_viability_score} />
                    <ScoreBar label="Coherence" score={assessment.coherence_score} />
                  </div>
                  <p className="text-sm">{assessment.summary}</p>
                  <p className="text-sm font-medium">{assessment.recommendation}</p>
                  {assessment.risk_flags.length > 0 && (
                    <div className="space-y-1 p-2 bg-amber-50 rounded">
                      {assessment.risk_flags.map((flag, i) => (
                        <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          {flag}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input / Actions */}
        {started && (
          <div className="p-3 border-t shrink-0">
            {!isComplete ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type the applicant's response..."
                    className="min-h-[44px] max-h-[120px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    size="icon"
                    className="h-11 w-11 bg-brand hover:bg-brand-light text-white shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {canEnd && (
                  <Button
                    onClick={endInterview}
                    disabled={completing}
                    variant="outline"
                    size="sm"
                    className="w-full text-muted-foreground"
                  >
                    {completing ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Square className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {completing ? "Ending..." : "End Interview"}
                  </Button>
                )}
              </div>
            ) : !assessment ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Interview completed. Generate an AI assessment of the applicant.
                </p>
                {assessError && (
                  <p className="text-xs text-red-600 text-center">{assessError}</p>
                )}
                <Button
                  onClick={generateAssessment}
                  disabled={assessing}
                  className="w-full bg-brand hover:bg-brand-light text-white"
                >
                  {assessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                  )}
                  {assessing ? "Generating Assessment..." : "Generate Assessment"}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Assessment complete. Score: {assessment.overall_score}/100
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${score}%`,
            backgroundColor: score >= 70 ? "#059669" : score >= 40 ? "#f59e0b" : "#ef4444",
          }}
        />
      </div>
    </div>
  );
}
