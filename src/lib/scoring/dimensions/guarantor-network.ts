import { prisma } from "@/lib/db";
import type { DimensionScore, SubScore } from "@/lib/scoring/types";
import { STANDARD_WEIGHTS } from "@/lib/scoring/types";

/**
 * Guarantor Network Quality Dimension
 *
 * Evaluates the strength and quality of a member's guarantor network:
 * - Available guarantors count (0-25 pts)
 * - Guarantor creditworthiness (0-30 pts)
 * - Diversity (0-15 pts)
 * - Reciprocal ratio (0-15 pts)
 * - Default exposure (0-15 pts)
 *
 * Weight: 10 (standard) / 17 (thin-file)
 */
export async function scoreGuarantorNetwork(
  memberId: string,
): Promise<DimensionScore> {
  const subScores: SubScore[] = [];

  // Fetch member's loans with their guarantors
  const memberLoans = await prisma.loan.findMany({
    where: { memberId },
    include: {
      guarantors: {
        include: {
          guarantor: {
            select: {
              id: true,
              barangay: true,
              creditScores: {
                orderBy: { scoreDate: "desc" },
                take: 1,
                select: { totalScore: true },
              },
              loans: {
                select: { status: true },
              },
            },
          },
        },
      },
    },
  });

  // Collect all unique active guarantors across all member loans
  const activeGuarantorMap = new Map<
    string,
    {
      id: string;
      barangay: string;
      latestScore: number | null;
      hasDefaultLoan: boolean;
    }
  >();

  for (const loan of memberLoans) {
    for (const g of loan.guarantors) {
      if (g.status === "ACTIVE" && !activeGuarantorMap.has(g.guarantorMemberId)) {
        const latestScore =
          g.guarantor.creditScores.length > 0
            ? g.guarantor.creditScores[0].totalScore
            : null;
        const hasDefaultLoan = g.guarantor.loans.some(
          (l) => l.status === "DEFAULT" || l.status === "DELINQUENT",
        );

        activeGuarantorMap.set(g.guarantorMemberId, {
          id: g.guarantorMemberId,
          barangay: g.guarantor.barangay,
          latestScore,
          hasDefaultLoan,
        });
      }
    }
  }

  const guarantors = Array.from(activeGuarantorMap.values());
  const guarantorCount = guarantors.length;

  // --- Sub-score 1: Available guarantors count (0-25 pts) ---
  let countPoints: number;
  let countDetails: string;

  if (guarantorCount >= 3) {
    countPoints = 25;
    countDetails = `${guarantorCount} active guarantors — strong network`;
  } else if (guarantorCount === 2) {
    countPoints = 18;
    countDetails = "2 active guarantors — adequate network";
  } else if (guarantorCount === 1) {
    countPoints = 10;
    countDetails = "1 active guarantor — limited network";
  } else {
    countPoints = 0;
    countDetails = "No active guarantors";
  }

  subScores.push({
    name: "Available guarantors count",
    value: countPoints,
    maxPoints: 25,
    details: countDetails,
  });

  // --- Sub-score 2: Guarantor creditworthiness (0-30 pts) ---
  let creditPoints: number;
  let creditDetails: string;

  if (guarantorCount === 0) {
    creditPoints = 0;
    creditDetails = "No guarantors to evaluate";
  } else {
    const guarantorsWithScores = guarantors.filter((g) => g.latestScore !== null);

    if (guarantorsWithScores.length === 0) {
      creditPoints = 10;
      creditDetails = "Guarantors have no credit scores — default score assigned";
    } else {
      const avgScore =
        guarantorsWithScores.reduce((sum, g) => sum + (g.latestScore ?? 0), 0) /
        guarantorsWithScores.length;

      if (avgScore > 650) {
        creditPoints = 30;
        creditDetails = `Average guarantor score: ${Math.round(avgScore)} (> 650)`;
      } else if (avgScore >= 550) {
        creditPoints = 20;
        creditDetails = `Average guarantor score: ${Math.round(avgScore)} (550-650)`;
      } else if (avgScore >= 450) {
        creditPoints = 10;
        creditDetails = `Average guarantor score: ${Math.round(avgScore)} (450-550)`;
      } else {
        creditPoints = 0;
        creditDetails = `Average guarantor score: ${Math.round(avgScore)} (< 450)`;
      }
    }
  }

  subScores.push({
    name: "Guarantor creditworthiness",
    value: creditPoints,
    maxPoints: 30,
    details: creditDetails,
  });

  // --- Sub-score 3: Diversity (0-15 pts) ---
  let diversityPoints: number;
  let diversityDetails: string;

  if (guarantorCount === 0) {
    diversityPoints = 0;
    diversityDetails = "No guarantors to evaluate diversity";
  } else {
    const uniqueBarangays = new Set(guarantors.map((g) => g.barangay));

    if (guarantorCount === 1) {
      diversityPoints = 3;
      diversityDetails = "Only 1 guarantor — minimal diversity";
    } else if (uniqueBarangays.size === guarantorCount) {
      diversityPoints = 15;
      diversityDetails = `All ${guarantorCount} guarantors from different barangays`;
    } else if (uniqueBarangays.size > 1) {
      diversityPoints = 8;
      diversityDetails = `${uniqueBarangays.size} unique barangays across ${guarantorCount} guarantors`;
    } else {
      diversityPoints = 3;
      diversityDetails = "All guarantors from the same barangay";
    }
  }

  subScores.push({
    name: "Diversity",
    value: diversityPoints,
    maxPoints: 15,
    details: diversityDetails,
  });

  // --- Sub-score 4: Reciprocal ratio (0-15 pts) ---
  let reciprocalPoints: number;
  let reciprocalDetails: string;

  // Check if this member also acts as a guarantor for others
  const memberAsGuarantor = await prisma.guarantor.findMany({
    where: { guarantorMemberId: memberId, status: "ACTIVE" },
    select: {
      loan: {
        select: { memberId: true },
      },
    },
  });

  const membersThisMemberGuarantees = new Set(
    memberAsGuarantor.map((g) => g.loan.memberId),
  );

  if (guarantorCount === 0 && membersThisMemberGuarantees.size === 0) {
    reciprocalPoints = 0;
    reciprocalDetails = "No guarantor relationships";
  } else if (membersThisMemberGuarantees.size > 0 && guarantorCount > 0) {
    // Check for reciprocal: member guarantees someone who also guarantees them
    const guarantorIds = new Set(guarantors.map((g) => g.id));
    const hasReciprocal = Array.from(membersThisMemberGuarantees).some((id) =>
      guarantorIds.has(id),
    );

    if (hasReciprocal) {
      reciprocalPoints = 15;
      reciprocalDetails = "Has reciprocal guarantor relationships";
    } else {
      reciprocalPoints = 8;
      reciprocalDetails = "Guarantees others but not reciprocated";
    }
  } else if (membersThisMemberGuarantees.size > 0) {
    reciprocalPoints = 8;
    reciprocalDetails = "Guarantees others but has no guarantors for own loans";
  } else {
    reciprocalPoints = 3;
    reciprocalDetails = "Only receives guarantees, does not guarantee others";
  }

  subScores.push({
    name: "Reciprocal ratio",
    value: reciprocalPoints,
    maxPoints: 15,
    details: reciprocalDetails,
  });

  // --- Sub-score 5: Default exposure (0-15 pts) ---
  let defaultExposurePoints: number;
  let defaultExposureDetails: string;

  if (guarantorCount === 0) {
    defaultExposurePoints = 0;
    defaultExposureDetails = "No guarantors to evaluate default exposure";
  } else {
    const guarantorsWithDefaults = guarantors.filter((g) => g.hasDefaultLoan);
    const defaultCount = guarantorsWithDefaults.length;

    if (defaultCount === 0) {
      defaultExposurePoints = 15;
      defaultExposureDetails = "No guarantors have defaulted or delinquent loans";
    } else if (defaultCount === 1) {
      defaultExposurePoints = 8;
      defaultExposureDetails = "1 guarantor has a defaulted or delinquent loan";
    } else {
      defaultExposurePoints = 0;
      defaultExposureDetails = `${defaultCount} guarantors have defaulted or delinquent loans`;
    }
  }

  subScores.push({
    name: "Default exposure",
    value: defaultExposurePoints,
    maxPoints: 15,
    details: defaultExposureDetails,
  });

  // --- Calculate total dimension score (0-100) ---
  const rawScore = subScores.reduce((sum, s) => sum + s.value, 0);
  const weight = STANDARD_WEIGHTS.guarantorNetwork;

  return {
    dimension: "Guarantor Network Quality",
    score: rawScore,
    weight,
    weightedScore: (rawScore * weight) / 100,
    subScores,
  };
}

export default scoreGuarantorNetwork;
