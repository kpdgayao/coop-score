import { NextRequest, NextResponse } from "next/server";
import { analyzeNarrative } from "@/lib/ai/narrative-analysis";

// POST /api/ai/narrative-analysis
export async function POST(request: NextRequest) {
  try {
    const { loanId } = await request.json();

    if (!loanId) {
      return NextResponse.json({ error: "loanId is required" }, { status: 400 });
    }

    const result = await analyzeNarrative(loanId);

    if (!result) {
      return NextResponse.json(
        { error: "AI analysis unavailable", fallback: true },
        { status: 503 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Narrative analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze narrative" },
      { status: 500 }
    );
  }
}
