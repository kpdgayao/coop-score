import { prisma } from "@/lib/db";
import type { DimensionScore, SubScore } from "@/lib/scoring/types";
import { STANDARD_WEIGHTS } from "@/lib/scoring/types";

/**
 * Capital Build-Up Behavior Dimension
 *
 * Evaluates a member's savings and capital accumulation patterns:
 * - CBU growth trend (0-30 pts)
 * - Voluntary savings presence (0-20 pts)
 * - Deposit consistency (0-25 pts)
 * - Net saver ratio (0-25 pts)
 *
 * Weight: 20 (standard) / 28 (thin-file)
 */
export async function scoreCapitalBuildup(
  memberId: string,
): Promise<DimensionScore> {
  const subScores: SubScore[] = [];
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // --- Sub-score 1: CBU growth trend (0-30 pts) ---
  // Compare share capital balance 12 months ago vs now
  const shareCapitalTransactions = await prisma.shareCapital.findMany({
    where: { memberId },
    orderBy: { transactionDate: "asc" },
  });

  let cbuPoints = 0;
  let cbuDetails: string;

  if (shareCapitalTransactions.length === 0) {
    cbuPoints = 0;
    cbuDetails = "No share capital records found";
  } else {
    // Find the balance closest to 12 months ago (last transaction on or before that date)
    const pastTransactions = shareCapitalTransactions.filter(
      (t) => t.transactionDate <= twelveMonthsAgo,
    );
    const balanceThen = pastTransactions.length > 0
      ? Number(pastTransactions[pastTransactions.length - 1].runningBalance)
      : 0;

    // Current balance is the most recent transaction's running balance
    const balanceNow = Number(
      shareCapitalTransactions[shareCapitalTransactions.length - 1].runningBalance,
    );

    if (balanceThen === 0) {
      // No history 12 months ago -- if they have a balance now, treat as maximum growth
      cbuPoints = balanceNow > 0 ? 30 : 0;
      cbuDetails = balanceNow > 0
        ? `New share capital holder; current balance: ${balanceNow.toLocaleString()}`
        : "No share capital balance";
    } else {
      const growthRate = (balanceNow - balanceThen) / balanceThen;
      const growthPercent = Math.round(growthRate * 100);

      if (growthRate > 0.1) {
        cbuPoints = 30;
      } else if (growthRate >= 0.05) {
        cbuPoints = 20;
      } else if (growthRate >= 0) {
        cbuPoints = 10;
      } else {
        cbuPoints = 0;
      }

      cbuDetails = `Share capital growth: ${growthPercent}% YoY (${balanceThen.toLocaleString()} -> ${balanceNow.toLocaleString()})`;
    }
  }

  subScores.push({
    name: "CBU growth trend",
    value: cbuPoints,
    maxPoints: 30,
    details: cbuDetails,
  });

  // --- Sub-score 2: Voluntary savings presence (0-20 pts) ---
  const voluntarySavings = await prisma.savingsTransaction.findFirst({
    where: {
      memberId,
      accountType: "SPECIAL",
    },
  });

  // Also check for deposits beyond required minimums in any savings account
  const savingsDeposits = await prisma.savingsTransaction.count({
    where: {
      memberId,
      transactionType: "DEPOSIT",
      accountType: { in: ["SPECIAL", "TIME_DEPOSIT"] },
    },
  });

  const hasVoluntarySavings = voluntarySavings !== null || savingsDeposits > 0;
  const voluntaryPoints = hasVoluntarySavings ? 20 : 0;

  subScores.push({
    name: "Voluntary savings presence",
    value: voluntaryPoints,
    maxPoints: 20,
    details: hasVoluntarySavings
      ? `Voluntary savings detected (${savingsDeposits} special/time deposit transaction(s))`
      : "No voluntary savings found",
  });

  // --- Sub-score 3: Deposit consistency (0-25 pts) ---
  // Check last 12 months of ShareCapital CONTRIBUTION transactions
  const contributions = await prisma.shareCapital.findMany({
    where: {
      memberId,
      transactionType: "CONTRIBUTION",
      transactionDate: { gte: twelveMonthsAgo },
    },
    orderBy: { transactionDate: "asc" },
  });

  // Build a set of months that had contributions (YYYY-MM format)
  const contributionMonths = new Set<string>();
  for (const c of contributions) {
    const d = new Date(c.transactionDate);
    contributionMonths.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  // Count the expected months in the last 12 months
  const expectedMonths: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    expectedMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const missedMonths = expectedMonths.filter(
    (m) => !contributionMonths.has(m),
  ).length;

  let consistencyPoints: number;
  if (missedMonths === 0) {
    consistencyPoints = 25;
  } else if (missedMonths <= 2) {
    consistencyPoints = 15;
  } else if (missedMonths <= 4) {
    consistencyPoints = 8;
  } else {
    consistencyPoints = 0;
  }

  subScores.push({
    name: "Deposit consistency",
    value: consistencyPoints,
    maxPoints: 25,
    details: `${12 - missedMonths}/12 months with contributions (${missedMonths} missed)`,
  });

  // --- Sub-score 4: Net saver ratio (0-25 pts) ---
  // Compare total deposits vs total withdrawals across all accounts
  const depositAgg = await prisma.savingsTransaction.aggregate({
    where: { memberId, transactionType: "DEPOSIT" },
    _sum: { amount: true },
  });
  const withdrawalAgg = await prisma.savingsTransaction.aggregate({
    where: { memberId, transactionType: "WITHDRAWAL" },
    _sum: { amount: true },
  });

  // Also include share capital contributions and withdrawals
  const scContributionAgg = await prisma.shareCapital.aggregate({
    where: { memberId, transactionType: "CONTRIBUTION" },
    _sum: { amount: true },
  });
  const scWithdrawalAgg = await prisma.shareCapital.aggregate({
    where: { memberId, transactionType: "WITHDRAWAL" },
    _sum: { amount: true },
  });

  const totalDeposits =
    Number(depositAgg._sum.amount ?? 0) +
    Number(scContributionAgg._sum.amount ?? 0);
  const totalWithdrawals =
    Number(withdrawalAgg._sum.amount ?? 0) +
    Number(scWithdrawalAgg._sum.amount ?? 0);

  let netSaverPoints: number;
  let netSaverDetails: string;

  if (totalDeposits === 0 && totalWithdrawals === 0) {
    netSaverPoints = 0;
    netSaverDetails = "No deposit or withdrawal records";
  } else if (totalWithdrawals === 0 || totalDeposits > 2 * totalWithdrawals) {
    netSaverPoints = 25;
    netSaverDetails = `Strong net saver (deposits: ${totalDeposits.toLocaleString()}, withdrawals: ${totalWithdrawals.toLocaleString()})`;
  } else if (totalDeposits > totalWithdrawals) {
    netSaverPoints = 15;
    netSaverDetails = `Net saver (deposits: ${totalDeposits.toLocaleString()}, withdrawals: ${totalWithdrawals.toLocaleString()})`;
  } else if (totalDeposits >= totalWithdrawals * 0.8) {
    netSaverPoints = 8;
    netSaverDetails = `Roughly balanced (deposits: ${totalDeposits.toLocaleString()}, withdrawals: ${totalWithdrawals.toLocaleString()})`;
  } else {
    netSaverPoints = 0;
    netSaverDetails = `Net withdrawer (deposits: ${totalDeposits.toLocaleString()}, withdrawals: ${totalWithdrawals.toLocaleString()})`;
  }

  subScores.push({
    name: "Net saver ratio",
    value: netSaverPoints,
    maxPoints: 25,
    details: netSaverDetails,
  });

  // --- Calculate total dimension score (0-100) ---
  const rawScore = subScores.reduce((sum, s) => sum + s.value, 0);
  const weight = STANDARD_WEIGHTS.capitalBuildup;

  return {
    dimension: "Capital Build-Up Behavior",
    score: rawScore,
    weight,
    weightedScore: (rawScore * weight) / 100,
    subScores,
  };
}

export default scoreCapitalBuildup;
