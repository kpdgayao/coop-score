import { prisma } from "@/lib/db";
import { PROGRESSIVE_LADDER } from "@/lib/scoring/types";

/**
 * Evaluates a member's position on the progressive lending ladder.
 *
 * Checks:
 * 1. Membership tenure
 * 2. PMES completion
 * 3. Guarantor count
 * 4. Loan history (completed loans, repayment quality)
 *
 * Returns the current stage, max loan amount, next stage requirements,
 * and whether the member is eligible for the next stage.
 */
export async function evaluateProgressiveLadder(memberId: string): Promise<{
  currentStage: string;
  maxLoanAmount: number;
  nextStageRequirements: string[];
  eligibleForNextStage: boolean;
}> {
  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    select: {
      membershipDate: true,
      pmesCompletionDate: true,
    },
  });

  // Get loan history
  const loans = await prisma.loan.findMany({
    where: { memberId },
    include: {
      payments: {
        select: { status: true },
      },
    },
    orderBy: { applicationDate: "asc" },
  });

  // Get active guarantor count for this member's loans
  const guarantorCount = await prisma.guarantor.count({
    where: {
      loan: { memberId },
      status: "ACTIVE",
    },
  });

  // Calculate key metrics
  const now = new Date();
  const membershipMonths =
    (now.getFullYear() - member.membershipDate.getFullYear()) * 12 +
    (now.getMonth() - member.membershipDate.getMonth());

  const hasPmes = member.pmesCompletionDate !== null;
  const completedLoans = loans.filter((l) => l.status === "PAID");
  const hasRestructured = loans.some((l) => l.status === "RESTRUCTURED");
  const hasDefault = loans.some((l) => l.status === "DEFAULT");

  // Evaluate repayment quality across all paid loans
  const allPayments = completedLoans.flatMap((l) => l.payments);
  const onTimePayments = allPayments.filter((p) => p.status === "ON_TIME").length;
  const totalPayments = allPayments.length;
  const repaymentQuality =
    totalPayments > 0 ? onTimePayments / totalPayments : 0;

  // Determine stage (from highest to lowest)

  // --- Standard ---
  // Has repayment history, completed loans, no defaults
  const standardStage = PROGRESSIVE_LADDER[3]; // "Standard"
  if (
    completedLoans.length >= 2 &&
    membershipMonths >= 12 &&
    !hasDefault &&
    repaymentQuality >= 0.7
  ) {
    return {
      currentStage: standardStage.stage,
      maxLoanAmount: standardStage.loanCeiling.max,
      nextStageRequirements: [],
      eligibleForNextStage: false, // Already at the top
    };
  }

  // --- Level 3 ---
  const level3Stage = PROGRESSIVE_LADDER[2]; // "Level 3"
  if (
    completedLoans.length >= 2 &&
    membershipMonths >= 12 &&
    guarantorCount >= 2 &&
    !hasRestructured
  ) {
    // Check eligibility for Standard
    const nextReqs: string[] = [];
    if (hasDefault) {
      nextReqs.push("Must have no defaulted loans");
    }
    if (repaymentQuality < 0.7) {
      nextReqs.push(
        `Improve repayment quality (currently ${Math.round(repaymentQuality * 100)}%, need 70%+)`,
      );
    }

    return {
      currentStage: level3Stage.stage,
      maxLoanAmount: level3Stage.loanCeiling.max,
      nextStageRequirements:
        nextReqs.length > 0
          ? nextReqs
          : ["Maintain consistent repayment to graduate to Standard"],
      eligibleForNextStage: nextReqs.length === 0,
    };
  }

  // --- Level 2 ---
  const level2Stage = PROGRESSIVE_LADDER[1]; // "Level 2"
  if (completedLoans.length >= 1 && membershipMonths >= 6) {
    // Check eligibility for Level 3
    const nextReqs: string[] = [];
    if (completedLoans.length < 2) {
      nextReqs.push(
        `Complete ${2 - completedLoans.length} more loan(s) with full repayment`,
      );
    }
    if (membershipMonths < 12) {
      nextReqs.push(
        `Need ${12 - membershipMonths} more month(s) of membership (require 12+)`,
      );
    }
    if (guarantorCount < 2) {
      nextReqs.push(`Need ${2 - guarantorCount} more guarantor(s) (require 2+)`);
    }
    if (hasRestructured) {
      nextReqs.push("No loan restructuring allowed for Level 3");
    }

    return {
      currentStage: level2Stage.stage,
      maxLoanAmount: level2Stage.loanCeiling.max,
      nextStageRequirements: nextReqs,
      eligibleForNextStage: nextReqs.length === 0,
    };
  }

  // --- Entry ---
  const entryStage = PROGRESSIVE_LADDER[0]; // "Entry"
  if (membershipMonths >= 3 && hasPmes && guarantorCount >= 1) {
    // Check eligibility for Level 2
    const nextReqs: string[] = [];
    if (completedLoans.length < 1) {
      nextReqs.push("Complete and repay first loan within term");
    }
    if (membershipMonths < 6) {
      nextReqs.push(
        `Need ${6 - membershipMonths} more month(s) of membership (require 6+)`,
      );
    }

    return {
      currentStage: entryStage.stage,
      maxLoanAmount: entryStage.loanCeiling.max,
      nextStageRequirements: nextReqs,
      eligibleForNextStage: nextReqs.length === 0,
    };
  }

  // --- Pre-Entry: Not yet eligible for any stage ---
  const preEntryReqs: string[] = [];
  if (membershipMonths < 3) {
    preEntryReqs.push(
      `Need ${3 - membershipMonths} more month(s) of membership (require 3+)`,
    );
  }
  if (!hasPmes) {
    preEntryReqs.push("Complete PMES (Pre-Membership Education Seminar)");
  }
  if (guarantorCount < 1) {
    preEntryReqs.push("Need at least 1 guarantor");
  }

  return {
    currentStage: "Pre-Entry",
    maxLoanAmount: 0,
    nextStageRequirements: preEntryReqs,
    eligibleForNextStage: false,
  };
}
