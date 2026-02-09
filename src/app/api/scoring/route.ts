import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeAndSaveScore } from "@/lib/scoring/engine";

// POST /api/scoring - Compute score for a member or batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, batch } = body;

    if (batch) {
      // Batch scoring for all active members
      const members = await prisma.member.findMany({
        where: { membershipStatus: "ACTIVE" },
        select: { id: true },
      });

      const results = [];
      for (const member of members) {
        try {
          const result = await computeAndSaveScore(member.id);
          results.push({ memberId: member.id, score: result.totalScore, success: true });
        } catch {
          results.push({ memberId: member.id, success: false });
        }
      }

      return NextResponse.json({
        processed: results.length,
        successful: results.filter((r) => r.success).length,
        results,
      });
    }

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const result = await computeAndSaveScore(memberId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scoring error:", error);
    return NextResponse.json(
      { error: "Failed to compute score" },
      { status: 500 }
    );
  }
}

// GET /api/scoring - Get score history for a member
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  try {
    const scores = await prisma.creditScore.findMany({
      where: { memberId },
      orderBy: { scoreDate: "desc" },
      take: 20,
    });

    return NextResponse.json(scores);
  } catch (error) {
    console.error("Score fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scores" },
      { status: 500 }
    );
  }
}
