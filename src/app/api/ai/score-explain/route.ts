import { NextRequest, NextResponse } from "next/server";
import { explainScore } from "@/lib/ai/score-explainer";

// POST /api/ai/score-explain
export async function POST(request: NextRequest) {
  try {
    const { creditScoreId } = await request.json();

    if (!creditScoreId) {
      return NextResponse.json(
        { error: "creditScoreId is required" },
        { status: 400 }
      );
    }

    const result = await explainScore(creditScoreId);

    if (!result) {
      return NextResponse.json(
        { error: "AI explanation unavailable", fallback: true },
        { status: 503 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Score explain error:", error);
    return NextResponse.json(
      { error: "Failed to explain score" },
      { status: 500 }
    );
  }
}
