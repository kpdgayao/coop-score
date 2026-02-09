import { NextRequest, NextResponse } from "next/server";
import { detectAnomalies, batchDetectAnomalies } from "@/lib/ai/anomaly-detection";

// POST /api/ai/anomaly-detect
export async function POST(request: NextRequest) {
  try {
    const { memberId, batch } = await request.json();

    if (batch) {
      return NextResponse.json(
        { error: "Batch anomaly detection is temporarily disabled" },
        { status: 403 }
      );
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
