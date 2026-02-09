import { NextRequest, NextResponse } from "next/server";
import { getCoaching } from "@/lib/ai/what-if-coach";

// POST /api/ai/what-if-coach
export async function POST(request: NextRequest) {
  try {
    const { memberId, simulationResults } = await request.json();

    if (!memberId || !simulationResults) {
      return NextResponse.json(
        { error: "memberId and simulationResults are required" },
        { status: 400 }
      );
    }

    const result = await getCoaching(memberId, simulationResults);

    if (!result) {
      return NextResponse.json(
        { error: "AI coaching unavailable", fallback: true },
        { status: 503 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("What-if coach error:", error);
    return NextResponse.json(
      { error: "Failed to generate coaching" },
      { status: 500 }
    );
  }
}
