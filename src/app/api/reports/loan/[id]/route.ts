import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { LoanReport, type LoanReportData } from "@/lib/pdf/loan-report";
import React from "react";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      member: {
        include: {
          creditScores: {
            orderBy: { scoreDate: "desc" },
            take: 1,
          },
        },
      },
      payments: {
        orderBy: { dueDate: "asc" },
      },
      guarantors: {
        include: {
          guarantor: {
            select: {
              firstName: true,
              lastName: true,
              membershipNumber: true,
            },
          },
        },
      },
      interviews: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: {
          conductedBy: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  const latestScore = loan.member.creditScores[0] ?? null;
  const latestInterview = loan.interviews[0] ?? null;

  const reportData: LoanReportData = {
    loan: {
      id: loan.id,
      loanType: loan.loanType,
      principalAmount: loan.principalAmount.toString(),
      interestRate: loan.interestRate.toString(),
      termMonths: loan.termMonths,
      purpose: loan.purpose,
      status: loan.status,
      applicationDate: loan.applicationDate,
      approvalDate: loan.approvalDate,
      releaseDate: loan.releaseDate,
      maturityDate: loan.maturityDate,
    },
    applicant: {
      firstName: loan.member.firstName,
      lastName: loan.member.lastName,
      membershipNumber: loan.member.membershipNumber,
      employmentType: loan.member.employmentType,
      employerOrBusiness: loan.member.employerOrBusiness,
      monthlyIncome: loan.member.monthlyIncome.toString(),
      membershipDate: loan.member.membershipDate,
    },
    narrativeAssessment: loan.narrativeAssessment as unknown as LoanReportData["narrativeAssessment"],
    creditScore: latestScore
      ? {
          totalScore: latestScore.totalScore,
          riskCategory: latestScore.riskCategory,
          scoringPathway: latestScore.scoringPathway,
          dimensionScores: Array.isArray(latestScore.dimensionScores)
            ? (latestScore.dimensionScores as unknown as NonNullable<LoanReportData["creditScore"]>["dimensionScores"])
            : [],
          recommendations: latestScore.recommendations as unknown as NonNullable<LoanReportData["creditScore"]>["recommendations"],
        }
      : null,
    payments: loan.payments.map((p) => ({
      dueDate: p.dueDate,
      amountDue: p.amountDue.toString(),
      amountPaid: p.amountPaid.toString(),
      principal: p.principal.toString(),
      interest: p.interest.toString(),
      penalty: p.penalty.toString(),
      status: p.status,
    })),
    guarantors: loan.guarantors.map((g) => ({
      name: `${g.guarantor.lastName}, ${g.guarantor.firstName}`,
      membershipNumber: g.guarantor.membershipNumber,
      guaranteedAmount: g.guaranteedAmount.toString(),
      status: g.status,
    })),
    interview: latestInterview
      ? {
          startedAt: latestInterview.startedAt,
          status: latestInterview.status,
          conductedByName: latestInterview.conductedBy.name,
          topicsCovered: latestInterview.topicsCovered,
          assessment: latestInterview.assessment as unknown as NonNullable<LoanReportData["interview"]>["assessment"],
        }
      : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(LoanReport, { data: reportData }) as any
  );

  const filename = `loan-report-${loan.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
