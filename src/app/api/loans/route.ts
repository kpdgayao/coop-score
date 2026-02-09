import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/loans - List all loans
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const memberId = searchParams.get("memberId");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    const loans = await prisma.loan.findMany({
      where: {
        ...(status && { status: status as never }),
        ...(memberId && { memberId }),
      },
      include: {
        member: {
          select: {
            firstName: true,
            lastName: true,
            membershipNumber: true,
          },
        },
      },
      orderBy: { applicationDate: "desc" },
      take: limit,
    });

    return NextResponse.json(loans);
  } catch (error) {
    console.error("Loans fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch loans" },
      { status: 500 }
    );
  }
}

// POST /api/loans - Create new loan application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberId,
      loanType,
      principalAmount,
      interestRate,
      termMonths,
      purpose,
    } = body;

    if (!memberId || !loanType || !principalAmount || !termMonths || !purpose) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const applicationDate = new Date();
    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + termMonths);

    const loan = await prisma.loan.create({
      data: {
        memberId,
        loanType,
        principalAmount,
        interestRate: interestRate || 0.02,
        termMonths,
        applicationDate,
        maturityDate,
        purpose,
        status: "PENDING",
      },
      include: {
        member: {
          select: { firstName: true, lastName: true, membershipNumber: true },
        },
      },
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error("Loan create error:", error);
    return NextResponse.json(
      { error: "Failed to create loan application" },
      { status: 500 }
    );
  }
}
