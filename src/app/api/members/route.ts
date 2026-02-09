import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/members - List all members with optional search/filter
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    const members = await prisma.member.findMany({
      where: {
        ...(status && { membershipStatus: status as "ACTIVE" | "INACTIVE" | "TERMINATED" }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { membershipNumber: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        creditScores: {
          orderBy: { scoreDate: "desc" },
          take: 1,
        },
      },
      orderBy: { lastName: "asc" },
      take: limit,
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Members fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
