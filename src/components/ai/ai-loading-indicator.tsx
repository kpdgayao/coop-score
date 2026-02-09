"use client";

import { Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AILoadingIndicatorProps {
  message?: string;
  className?: string;
}

export function AILoadingIndicator({
  message = "AI is analyzing...",
  className,
}: AILoadingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 bg-brand/5 border border-brand/20 rounded-lg",
        className
      )}
    >
      <div className="relative">
        <Brain className="h-5 w-5 text-brand" />
        <Loader2 className="h-3 w-3 text-brand absolute -bottom-0.5 -right-0.5 animate-spin" />
      </div>
      <div>
        <p className="text-sm font-medium text-brand">{message}</p>
        <p className="text-xs text-muted-foreground">
          Powered by Claude AI
        </p>
      </div>
    </div>
  );
}
