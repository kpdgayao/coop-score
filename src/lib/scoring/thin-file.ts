import { prisma } from "@/lib/db";
import { PROGRESSIVE_LADDER } from "@/lib/scoring/types";

/**
 * Determines whether a member is a "thin-file" member.
 *
 * A thin-file member has no loans with repayment history. Specifically,
 * if they have no Loan records with status PAID, CURRENT, DELINQUENT,
 * DEFAULT, or RESTRUCTURED, they are considered thin-file.
 */
export async function isThinFileMember(memberId: string): Promise<boolean> {
  const loanWithHistory = await prisma.loan.findFirst({
    where: {
      memberId,
      status: {
        in: ["PAID", "CURRENT", "DELINQUENT", "DEFAULT", "RESTRUCTURED"],
      },
    },
    select: { id: true },
  });

  return loanWithHistory === null;
}

/**
 * Determines a member's position on the progressive lending ladder.
 *
 * Checks loan history, membership tenure, and other factors to determine
 * which stage the member is at and what they need for the next stage.
 */
export async function getProgressiveLadderStage(memberId: string): Promise<{
  stage: string;
  eligible: boolean;
  nextStage?: string;
  requirements: string[];
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
    select: {
      status: true,
      principalAmount: true,
      applicationDate: true,
    },
    orderBy: { applicationDate: "asc" },
  });

  // Get guarantor count for this member's loans
  const guarantorCount = await prisma.guarantor.count({
    where: {
      loan: { memberId },
      status: "ACTIVE",
    },
  });

  const now = new Date();
  const membershipMonths =
    (now.getFullYear() - member.membershipDate.getFullYear()) * 12 +
    (now.getMonth() - member.membershipDate.getMonth());
  const hasPmes = member.pmesCompletionDate !== null;
  const completedLoans = loans.filter((l) => l.status === "PAID");
  const hasRestructured = loans.some((l) => l.status === "RESTRUCTURED");
  const hasDefault = loans.some((l) => l.status === "DEFAULT");

  // Determine current stage based on history
  // Standard: has repayment history (any loan completed)
  if (completedLoans.length >= 2 && membershipMonths >= 12 && !hasDefault) {
    const nextStage = undefined; // Already at standard
    return {
      stage: "Standard",
      eligible: true,
      nextStage,
      requirements: PROGRESSIVE_LADDER[3].requirements,
    };
  }

  // Level 3: completed Level 2, 1+ year membership, 2 guarantors
  if (
    completedLoans.length >= 2 &&
    membershipMonths >= 12 &&
    guarantorCount >= 2 &&
    !hasRestructured
  ) {
    return {
      stage: "Level 3",
      eligible: true,
      nextStage: "Standard",
      requirements: buildMissingRequirements("Standard", {
        membershipMonths,
        hasPmes,
        guarantorCount,
        completedLoans: completedLoans.length,
        hasRestructured,
      }),
    };
  }

  // Level 2: Entry loan repaid, 6+ months membership
  if (completedLoans.length >= 1 && membershipMonths >= 6 && !hasRestructured) {
    return {
      stage: "Level 2",
      eligible: true,
      nextStage: "Level 3",
      requirements: buildMissingRequirements("Level 3", {
        membershipMonths,
        hasPmes,
        guarantorCount,
        completedLoans: completedLoans.length,
        hasRestructured,
      }),
    };
  }

  // Entry: 3 months membership, PMES completed, 1 guarantor
  if (membershipMonths >= 3 && hasPmes && guarantorCount >= 1) {
    return {
      stage: "Entry",
      eligible: true,
      nextStage: "Level 2",
      requirements: buildMissingRequirements("Level 2", {
        membershipMonths,
        hasPmes,
        guarantorCount,
        completedLoans: completedLoans.length,
        hasRestructured,
      }),
    };
  }

  // Not yet eligible for Entry
  return {
    stage: "Pre-Entry",
    eligible: false,
    nextStage: "Entry",
    requirements: buildMissingRequirements("Entry", {
      membershipMonths,
      hasPmes,
      guarantorCount,
      completedLoans: completedLoans.length,
      hasRestructured,
    }),
  };
}

/**
 * Builds a list of missing requirements to reach the target stage.
 */
function buildMissingRequirements(
  targetStage: string,
  info: {
    membershipMonths: number;
    hasPmes: boolean;
    guarantorCount: number;
    completedLoans: number;
    hasRestructured: boolean;
  },
): string[] {
  const missing: string[] = [];

  switch (targetStage) {
    case "Entry":
      if (info.membershipMonths < 3) {
        missing.push(`Need ${3 - info.membershipMonths} more month(s) of membership`);
      }
      if (!info.hasPmes) {
        missing.push("Complete PMES (Pre-Membership Education Seminar)");
      }
      if (info.guarantorCount < 1) {
        missing.push("Need at least 1 guarantor");
      }
      break;

    case "Level 2":
      if (info.completedLoans < 1) {
        missing.push("Complete and repay Entry-level loan");
      }
      if (info.membershipMonths < 6) {
        missing.push(`Need ${6 - info.membershipMonths} more month(s) of membership`);
      }
      break;

    case "Level 3":
      if (info.completedLoans < 2) {
        missing.push(`Need ${2 - info.completedLoans} more completed loan(s)`);
      }
      if (info.membershipMonths < 12) {
        missing.push(`Need ${12 - info.membershipMonths} more month(s) of membership`);
      }
      if (info.guarantorCount < 2) {
        missing.push(`Need ${2 - info.guarantorCount} more guarantor(s)`);
      }
      if (info.hasRestructured) {
        missing.push("No loan restructuring allowed");
      }
      break;

    case "Standard":
      if (info.completedLoans < 2) {
        missing.push(`Need ${2 - info.completedLoans} more completed loan(s)`);
      }
      if (info.membershipMonths < 12) {
        missing.push(`Need ${12 - info.membershipMonths} more month(s) of membership`);
      }
      break;
  }

  if (missing.length === 0) {
    missing.push("All requirements met — eligible for graduation");
  }

  return missing;
}
