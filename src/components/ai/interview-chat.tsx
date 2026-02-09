"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
}

interface InterviewChatProps {
  loanId: string;
  memberId: string;
  memberName: string;
  interviewId?: string;
}

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/loan-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, action: "start" }),
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
      // Fallback greeting
      setMessages([
        {
          role: "assistant",
          content: `Magandang araw! I'm here to have a friendly conversation with you about your loan application. This will help our credit committee better understand your needs. Let's start — could you tell me about your business or livelihood?`,
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

  return (
    <Card className="flex flex-col h-[calc(100vh-10rem)] max-h-[600px] min-h-[400px]">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5 text-teal" />
            Loan Interview — {memberName}
          </CardTitle>
          {started && (
            <Badge variant={isComplete ? "default" : "secondary"}>
              {isComplete ? "Complete" : "In Progress"}
            </Badge>
          )}
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

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {!started ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm mb-4">
                Start a guided loan interview with the applicant.
                <br />
                The AI will cover 5 required topics for assessment.
              </p>
              <Button
                onClick={startInterview}
                disabled={loading}
                className="bg-teal hover:bg-teal-light text-white"
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
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        {started && !isComplete && (
          <div className="p-4 border-t">
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
                className="h-11 w-11 bg-teal hover:bg-teal-light text-white shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
