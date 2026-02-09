import { prisma } from "@/lib/db";
import type { DimensionScore, SubScore } from "@/lib/scoring/types";
import { STANDARD_WEIGHTS } from "@/lib/scoring/types";

/**
 * Membership Maturity & Stability Dimension
 *
 * Evaluates how established and stable a member is within the cooperative:
 * - Tenure (0-35 pts)
 * - Continuous good standing (0-25 pts)
 * - PMES completion (0-15 pts)
 * - Multi-product adoption (0-25 pts)
 *
 * Weight: 10 (standard) / 15 (thin-file)
 */
export async function scoreMembershipMaturity(
  memberId: string,
): Promise<DimensionScore> {
  const subScores: SubScore[] = [];
  const now = new Date();

  // Fetch the member record
  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
  });

  // --- Sub-score 1: Tenure (0-35 pts) ---
  const membershipDate = new Date(member.membershipDate);
  const tenureMs = now.getTime() - membershipDate.getTime();
  const tenureMonths = tenureMs / (1000 * 60 * 60 * 24 * 30.44); // approximate months

  let tenurePoints: number;
  let tenureDetails: string;

  if (tenureMonths >= 60) {
    // 5+ years
    tenurePoints = 35;
    tenureDetails = `${Math.floor(tenureMonths / 12)} years of membership (5+ years)`;
  } else if (tenureMonths >= 36) {
    // 3-5 years
    tenurePoints = 28;
    tenureDetails = `${Math.floor(tenureMonths / 12)} years of membership (3-5 years)`;
  } else if (tenureMonths >= 12) {
    // 1-3 years
    tenurePoints = 18;
    tenureDetails = `${Math.floor(tenureMonths)} months of membership (1-3 years)`;
  } else if (tenureMonths >= 6) {
    // 6 months to 1 year
    tenurePoints = 10;
    tenureDetails = `${Math.floor(tenureMonths)} months of membership (6mo-1yr)`;
  } else {
    tenurePoints = 3;
    tenureDetails = `${Math.floor(tenureMonths)} months of membership (under 6 months)`;
  }

  subScores.push({
    name: "Tenure",
    value: tenurePoints,
    maxPoints: 35,
    details: tenureDetails,
  });

  // --- Sub-score 2: Continuous good standing (0-25 pts) ---
  // Check current membership status. We look for any periods of INACTIVE status
  // by checking credit scores or anomaly alerts that may indicate past inactivity.
  // Since the schema stores membershipStatus on the Member model (current state only),
  // we check if the member is currently ACTIVE and use available signals to detect
  // past inactivity periods (e.g., anomaly alerts or gaps in activity).
  let standingPoints: number;
  let standingDetails: string;

  if (member.membershipStatus === "INACTIVE" || member.membershipStatus === "TERMINATED") {
    standingPoints = 0;
    standingDetails = `Currently ${member.membershipStatus.toLowerCase()}`;
  } else {
    // Member is currently ACTIVE -- check for any past periods of inactivity
    // Look for gaps in share capital contributions exceeding 6 months as a proxy
    // for periods where the member may have been inactive
    const allContributions = await prisma.shareCapital.findMany({
      where: {
        memberId,
        transactionType: "CONTRIBUTION",
      },
      orderBy: { transactionDate: "asc" },
    });

    let hadInactivePeriod = false;

    if (allContributions.length >= 2) {
      for (let i = 1; i < allContributions.length; i++) {
        const prev = new Date(allContributions[i - 1].transactionDate);
        const curr = new Date(allContributions[i].transactionDate);
        const gapMonths =
          (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        if (gapMonths > 6) {
          hadInactivePeriod = true;
          break;
        }
      }
    }

    if (!hadInactivePeriod) {
      standingPoints = 25;
      standingDetails = "Continuously active with no inactivity periods detected";
    } else {
      standingPoints = 15;
      standingDetails = "Currently active but had a period of inactivity (>6 month contribution gap)";
    }
  }

  subScores.push({
    name: "Continuous good standing",
    value: standingPoints,
    maxPoints: 25,
    details: standingDetails,
  });

  // --- Sub-score 3: PMES completion (0-15 pts) ---
  const pmesPoints = member.pmesCompletionDate ? 15 : 0;

  subScores.push({
    name: "PMES completion",
    value: pmesPoints,
    maxPoints: 15,
    details: member.pmesCompletionDate
      ? `PMES completed on ${new Date(member.pmesCompletionDate).toLocaleDateString()}`
      : "PMES not yet completed",
  });

  // --- Sub-score 4: Multi-product adoption (0-25 pts) ---
  // Count distinct product types used by the member
  const [hasShareCapital, hasSavings, hasLoan, hasServiceUsage] =
    await Promise.all([
      prisma.shareCapital.findFirst({ where: { memberId } }),
      prisma.savingsTransaction.findFirst({ where: { memberId } }),
      prisma.loan.findFirst({ where: { memberId } }),
      prisma.coopServiceUsage.findFirst({ where: { memberId } }),
    ]);

  const productCount =
    (hasShareCapital ? 1 : 0) +
    (hasSavings ? 1 : 0) +
    (hasLoan ? 1 : 0) +
    (hasServiceUsage ? 1 : 0);

  const products: string[] = [];
  if (hasShareCapital) products.push("Share Capital");
  if (hasSavings) products.push("Savings");
  if (hasLoan) products.push("Loans");
  if (hasServiceUsage) products.push("Coop Services");

  let multiProductPoints: number;
  if (productCount >= 4) {
    multiProductPoints = 25;
  } else if (productCount === 3) {
    multiProductPoints = 18;
  } else if (productCount === 2) {
    multiProductPoints = 12;
  } else if (productCount === 1) {
    multiProductPoints = 5;
  } else {
    multiProductPoints = 0;
  }

  subScores.push({
    name: "Multi-product adoption",
    value: multiProductPoints,
    maxPoints: 25,
    details:
      productCount > 0
        ? `${productCount} product type(s) used: ${products.join(", ")}`
        : "No cooperative products used",
  });

  // --- Calculate total dimension score (0-100) ---
  const rawScore = subScores.reduce((sum, s) => sum + s.value, 0);
  const weight = STANDARD_WEIGHTS.membershipMaturity;

  return {
    dimension: "Membership Maturity & Stability",
    score: rawScore,
    weight,
    weightedScore: (rawScore * weight) / 100,
    subScores,
  };
}

export default scoreMembershipMaturity;
