import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { MemberReport, type MemberReportData } from "@/lib/pdf/member-report";
import React from "react";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      shareCapital: {
        orderBy: { transactionDate: "desc" },
        take: 1,
        select: { runningBalance: true },
      },
      loans: {
        orderBy: { applicationDate: "desc" },
        select: {
          id: true,
          loanType: true,
          principalAmount: true,
          status: true,
          applicationDate: true,
          maturityDate: true,
          termMonths: true,
        },
      },
      creditScores: {
        orderBy: { scoreDate: "desc" },
        take: 1,
      },
      activityAttendance: {
        select: { attended: true },
      },
      committeeService: {
        select: {
          committeeName: true,
          role: true,
          isActive: true,
        },
      },
      referralsMade: {
        select: { id: true },
      },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const latestScore = member.creditScores[0] ?? null;

  const reportData: MemberReportData = {
    member: {
      membershipNumber: member.membershipNumber,
      firstName: member.firstName,
      middleName: member.middleName,
      lastName: member.lastName,
      dateOfBirth: member.dateOfBirth,
      gender: member.gender,
      civilStatus: member.civilStatus,
      barangay: member.barangay,
      city: member.city,
      province: member.province,
      contactNumber: member.contactNumber,
      email: member.email,
      employmentType: member.employmentType,
      employerOrBusiness: member.employerOrBusiness,
      monthlyIncome: member.monthlyIncome.toString(),
      membershipDate: member.membershipDate,
      membershipStatus: member.membershipStatus,
      pmesCompletionDate: member.pmesCompletionDate,
    },
    creditScore: latestScore
      ? {
          totalScore: latestScore.totalScore,
          riskCategory: latestScore.riskCategory,
          scoringPathway: latestScore.scoringPathway,
          scoreDate: latestScore.scoreDate,
          modelVersion: latestScore.modelVersion,
          dimensionScores: Array.isArray(latestScore.dimensionScores)
            ? (latestScore.dimensionScores as unknown as NonNullable<MemberReportData["creditScore"]>["dimensionScores"])
            : [],
          recommendations: latestScore.recommendations as unknown as NonNullable<MemberReportData["creditScore"]>["recommendations"],
        }
      : null,
    shareCapitalBalance: member.shareCapital[0]
      ? member.shareCapital[0].runningBalance.toString()
      : null,
    loans: member.loans.map((l) => ({
      id: l.id,
      loanType: l.loanType,
      principalAmount: l.principalAmount.toString(),
      status: l.status,
      applicationDate: l.applicationDate,
      maturityDate: l.maturityDate,
      termMonths: l.termMonths,
    })),
    engagement: {
      activitiesAttended: member.activityAttendance.filter((a) => a.attended).length,
      activitiesInvited: member.activityAttendance.length,
      committees: member.committeeService,
      referralsMade: member.referralsMade.length,
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    React.createElement(MemberReport, { data: reportData }) as any
  );

  const filename = `member-report-${member.membershipNumber}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
