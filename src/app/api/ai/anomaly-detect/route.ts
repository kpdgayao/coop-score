import { NextRequest, NextResponse } from "next/server";
import { detectAnomalies, batchDetectAnomalies } from "@/lib/ai/anomaly-detection";

// POST /api/ai/anomaly-detect
export async function POST(request: NextRequest) {
  try {
    const { memberId, batch } = await request.json();

    if (batch) {
      const result = await batchDetectAnomalies();
      return NextResponse.json(result);
    }

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 }
      );
    }

    const alerts = await detectAnomalies(memberId);
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Anomaly detection error:", error);
    return NextResponse.json(
      { error: "Failed to detect anomalies" },
      { status: 500 }
    );
  }
}
