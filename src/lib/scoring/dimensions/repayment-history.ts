import { prisma } from "@/lib/db";
import type { DimensionScore, SubScore } from "@/lib/scoring/types";
import { STANDARD_WEIGHTS } from "@/lib/scoring/types";

/**
 * Repayment History Dimension
 *
 * Evaluates a member's loan repayment behavior based on:
 * - On-time payment rate (0-35 pts)
 * - Days past due frequency (0-25 pts)
 * - Restructuring count (0-20 pts)
 * - Default history (0-20 pts)
 *
 * Weight: 25 (standard) / 0 (thin-file)
 */
export async function scoreRepaymentHistory(
  memberId: string,
): Promise<DimensionScore> {
  const subScores: SubScore[] = [];

  // Fetch all loans for the member
  const loans = await prisma.loan.findMany({
    where: { memberId },
    include: { payments: true },
  });

  // Gather all payments across all loans
  const allPayments = loans.flatMap((loan) => loan.payments);

  // --- Sub-score 1: On-time payment rate (0-35 pts) ---
  let onTimePoints = 0;
  let onTimeDetails: string;

  if (allPayments.length === 0) {
    onTimePoints = 0;
    onTimeDetails = "No payment records found";
  } else {
    const onTimeCount = allPayments.filter(
      (p) => p.status === "ON_TIME",
    ).length;
    const onTimeRate = onTimeCount / allPayments.length;
    const onTimePercent = Math.round(onTimeRate * 100);

    if (onTimeRate >= 1.0) {
      onTimePoints = 35;
    } else if (onTimeRate >= 0.9) {
      onTimePoints = 30;
    } else if (onTimeRate >= 0.8) {
      onTimePoints = 25;
    } else if (onTimeRate >= 0.7) {
      onTimePoints = 15;
    } else {
      onTimePoints = 5;
    }

    onTimeDetails = `${onTimeCount}/${allPayments.length} payments on time (${onTimePercent}%)`;
  }

  subScores.push({
    name: "On-time payment rate",
    value: onTimePoints,
    maxPoints: 35,
    details: onTimeDetails,
  });

  // --- Sub-score 2: Days past due frequency (0-25 pts) ---
  const lateOrMissedCount = allPayments.filter(
    (p) => p.status === "LATE" || p.status === "MISSED",
  ).length;

  let dpfPoints: number;
  if (lateOrMissedCount === 0) {
    dpfPoints = 25;
  } else if (lateOrMissedCount <= 2) {
    dpfPoints = 20;
  } else if (lateOrMissedCount <= 5) {
    dpfPoints = 10;
  } else {
    dpfPoints = 0;
  }

  subScores.push({
    name: "Days past due frequency",
    value: dpfPoints,
    maxPoints: 25,
    details: `${lateOrMissedCount} late/missed payment(s)`,
  });

  // --- Sub-score 3: Restructuring count (0-20 pts) ---
  const restructuredCount = loans.filter(
    (l) => l.status === "RESTRUCTURED",
  ).length;

  let restructuringPoints: number;
  if (restructuredCount === 0) {
    restructuringPoints = 20;
  } else if (restructuredCount === 1) {
    restructuringPoints = 10;
  } else {
    restructuringPoints = 0;
  }

  subScores.push({
    name: "Restructuring count",
    value: restructuringPoints,
    maxPoints: 20,
    details: `${restructuredCount} restructured loan(s)`,
  });

  // --- Sub-score 4: Default history (0-20 pts) ---
  const defaultCount = loans.filter((l) => l.status === "DEFAULT").length;

  let defaultPoints: number;
  if (defaultCount === 0) {
    defaultPoints = 20;
  } else if (defaultCount === 1) {
    defaultPoints = 5;
  } else {
    defaultPoints = 0;
  }

  subScores.push({
    name: "Default history",
    value: defaultPoints,
    maxPoints: 20,
    details: `${defaultCount} defaulted loan(s)`,
  });

  // --- Calculate total dimension score (0-100) ---
  const rawScore = subScores.reduce((sum, s) => sum + s.value, 0);
  const weight = STANDARD_WEIGHTS.repaymentHistory;

  return {
    dimension: "Repayment History",
    score: rawScore,
    weight,
    weightedScore: (rawScore * weight) / 100,
    subScores,
  };
}

export default scoreRepaymentHistory;
