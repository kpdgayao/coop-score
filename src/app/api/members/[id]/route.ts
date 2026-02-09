import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/members/[id] - Delete a member (only if they have no loans or scores)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        loans: { select: { id: true }, take: 1 },
        creditScores: { select: { id: true }, take: 1 },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (member.loans.length > 0 || member.creditScores.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete a member with existing loans or credit scores" },
        { status: 409 }
      );
    }

    await prisma.member.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Member delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }
}
