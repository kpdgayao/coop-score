import { NextRequest, NextResponse } from "next/server";
import {
  startInterview,
  continueInterview,
  assessInterview,
} from "@/lib/ai/loan-interview";

// POST /api/ai/loan-interview
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "start": {
        const { loanId } = body;
        if (!loanId) {
          return NextResponse.json(
            { error: "loanId is required" },
            { status: 400 }
          );
        }
        // Use a default conductedBy ID for now
        const result = await startInterview(loanId, body.conductedById || "system");
        return NextResponse.json(result);
      }

      case "continue": {
        const { interviewId, message } = body;
        if (!interviewId || !message) {
          return NextResponse.json(
            { error: "interviewId and message are required" },
            { status: 400 }
          );
        }
        const result = await continueInterview(interviewId, message);
        return NextResponse.json(result);
      }

      case "assess": {
        const { interviewId: assessId } = body;
        if (!assessId) {
          return NextResponse.json(
            { error: "interviewId is required" },
            { status: 400 }
          );
        }
        const result = await assessInterview(assessId);
        if (!result) {
          return NextResponse.json(
            { error: "Assessment unavailable" },
            { status: 503 }
          );
        }
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: start, continue, assess" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Loan interview error:", error);
    return NextResponse.json(
      { error: "Interview operation failed" },
      { status: 500 }
    );
  }
}
