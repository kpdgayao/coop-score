import { prisma } from "@/lib/db";
import type { DimensionScore, SubScore } from "@/lib/scoring/types";
import { STANDARD_WEIGHTS } from "@/lib/scoring/types";

/**
 * Cooperative Engagement & Social Capital Dimension
 *
 * Evaluates a member's participation and involvement in cooperative life:
 * - GA attendance rate (0-25 pts, 25% of dimension)
 * - Financial literacy training (0-20 pts, 20%)
 * - Committee service (0-15 pts, 15%)
 * - Patronage of services (0-15 pts, 15%)
 * - Volunteerism (0-10 pts, 10%)
 * - Guarantor track record (0-10 pts, 10%)
 * - Member referrals (0-5 pts, 5%)
 *
 * Weight: 20 (standard) / 30 (thin-file)
 */
export async function scoreCooperativeEngagement(
  memberId: string,
): Promise<DimensionScore> {
  const subScores: SubScore[] = [];
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // --- Sub-score 1: GA attendance rate (0-25 pts) ---
  // Query all GENERAL_ASSEMBLY activities and the member's attendance
  const gaActivities = await prisma.coopActivity.findMany({
    where: { activityType: "GENERAL_ASSEMBLY" },
    include: {
      attendance: {
        where: { memberId },
      },
    },
  });

  let gaPoints = 0;
  let gaDetails: string;

  if (gaActivities.length === 0) {
    gaPoints = 0;
    gaDetails = "No General Assembly events on record";
  } else {
    const attended = gaActivities.filter(
      (ga) => ga.attendance.length > 0 && ga.attendance[0].attended,
    ).length;
    const rate = attended / gaActivities.length;
    const ratePercent = Math.round(rate * 100);

    if (rate >= 0.8) {
      gaPoints = 25;
    } else if (rate >= 0.6) {
      gaPoints = 18;
    } else if (rate >= 0.4) {
      gaPoints = 10;
    } else {
      gaPoints = 3;
    }

    gaDetails = `${attended}/${gaActivities.length} GAs attended (${ratePercent}%)`;
  }

  subScores.push({
    name: "GA attendance rate",
    value: gaPoints,
    maxPoints: 25,
    details: gaDetails,
  });

  // --- Sub-score 2: Financial literacy training (0-20 pts) ---
  const finLitAttendance = await prisma.activityAttendance.findMany({
    where: {
      memberId,
      attended: true,
      activity: {
        activityType: "TRAINING",
        category: "FINANCIAL_LITERACY",
      },
    },
  });

  const finLitCount = finLitAttendance.length;
  let finLitPoints: number;

  if (finLitCount >= 3) {
    finLitPoints = 20;
  } else if (finLitCount === 2) {
    finLitPoints = 15;
  } else if (finLitCount === 1) {
    finLitPoints = 8;
  } else {
    finLitPoints = 0;
  }

  subScores.push({
    name: "Financial literacy training",
    value: finLitPoints,
    maxPoints: 20,
    details: `${finLitCount} financial literacy training(s) attended`,
  });

  // --- Sub-score 3: Committee service (0-15 pts) ---
  const committeeRecords = await prisma.committeeService.findMany({
    where: { memberId },
    orderBy: { startDate: "desc" },
  });

  let committeePoints = 0;
  let committeeDetails: string;

  if (committeeRecords.length === 0) {
    committeePoints = 0;
    committeeDetails = "No committee service";
  } else {
    const activeRecords = committeeRecords.filter((r) => r.isActive);
    const pastRecords = committeeRecords.filter((r) => !r.isActive);

    if (activeRecords.length > 0) {
      // Find the highest role among active service
      const activeRoles = activeRecords.map((r) => r.role);
      if (activeRoles.includes("CHAIR") || activeRoles.includes("VICE_CHAIR")) {
        committeePoints = 15;
        committeeDetails = "Active chair/vice-chair in committee";
      } else if (activeRoles.includes("SECRETARY")) {
        committeePoints = 12;
        committeeDetails = "Active secretary in committee";
      } else {
        committeePoints = 8;
        committeeDetails = "Active committee member";
      }
    } else if (pastRecords.length > 0) {
      committeePoints = 5;
      committeeDetails = `Past committee service (${pastRecords.length} record(s))`;
    } else {
      committeePoints = 0;
      committeeDetails = "No committee service";
    }
  }

  subScores.push({
    name: "Committee service",
    value: committeePoints,
    maxPoints: 15,
    details: committeeDetails,
  });

  // --- Sub-score 4: Patronage of services (0-15 pts) ---
  const serviceUsageCount = await prisma.coopServiceUsage.count({
    where: {
      memberId,
      transactionDate: { gte: twelveMonthsAgo },
    },
  });

  let patronagePoints: number;
  if (serviceUsageCount >= 10) {
    patronagePoints = 15;
  } else if (serviceUsageCount >= 5) {
    patronagePoints = 10;
  } else if (serviceUsageCount >= 1) {
    patronagePoints = 5;
  } else {
    patronagePoints = 0;
  }

  subScores.push({
    name: "Patronage of services",
    value: patronagePoints,
    maxPoints: 15,
    details: `${serviceUsageCount} coop service transaction(s) in last 12 months`,
  });

  // --- Sub-score 5: Volunteerism (0-10 pts) ---
  const volunteerAttendance = await prisma.activityAttendance.count({
    where: {
      memberId,
      attended: true,
      activity: {
        activityType: { in: ["VOLUNTEER", "COMMUNITY_SERVICE"] },
      },
    },
  });

  let volunteerPoints: number;
  if (volunteerAttendance >= 3) {
    volunteerPoints = 10;
  } else if (volunteerAttendance >= 1) {
    volunteerPoints = 5;
  } else {
    volunteerPoints = 0;
  }

  subScores.push({
    name: "Volunteerism",
    value: volunteerPoints,
    maxPoints: 10,
    details: `${volunteerAttendance} volunteer/community service activity(ies) attended`,
  });

  // --- Sub-score 6: Guarantor track record (0-10 pts) ---
  const guarantorRecords = await prisma.guarantor.findMany({
    where: { guarantorMemberId: memberId },
  });

  let guarantorPoints: number;
  let guarantorDetails: string;

  if (guarantorRecords.length === 0) {
    guarantorPoints = 3;
    guarantorDetails = "No guarantor records (neutral)";
  } else {
    const hasCalledRecord = guarantorRecords.some(
      (g) => g.status === "CALLED",
    );
    const allReleased = guarantorRecords.every(
      (g) => g.status === "RELEASED",
    );

    if (hasCalledRecord) {
      guarantorPoints = 0;
      guarantorDetails = `Guarantor called on defaulted loan(s) (${guarantorRecords.length} record(s))`;
    } else if (allReleased) {
      guarantorPoints = 10;
      guarantorDetails = `All ${guarantorRecords.length} guarantor obligation(s) successfully released`;
    } else {
      guarantorPoints = 5;
      guarantorDetails = `Mixed guarantor status (${guarantorRecords.length} record(s), some still active)`;
    }
  }

  subScores.push({
    name: "Guarantor track record",
    value: guarantorPoints,
    maxPoints: 10,
    details: guarantorDetails,
  });

  // --- Sub-score 7: Member referrals (0-5 pts) ---
  const referralCount = await prisma.memberReferral.count({
    where: { referrerId: memberId },
  });

  let referralPoints: number;
  if (referralCount >= 3) {
    referralPoints = 5;
  } else if (referralCount >= 1) {
    referralPoints = 3;
  } else {
    referralPoints = 0;
  }

  subScores.push({
    name: "Member referrals",
    value: referralPoints,
    maxPoints: 5,
    details: `${referralCount} member(s) referred`,
  });

  // --- Calculate total dimension score (0-100) ---
  const rawScore = subScores.reduce((sum, s) => sum + s.value, 0);
  const weight = STANDARD_WEIGHTS.cooperativeEngagement;

  return {
    dimension: "Cooperative Engagement & Social Capital",
    score: rawScore,
    weight,
    weightedScore: (rawScore * weight) / 100,
    subScores,
  };
}

export default scoreCooperativeEngagement;
