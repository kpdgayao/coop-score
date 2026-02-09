import { prisma } from "@/lib/db";
import type { DimensionScore, SubScore } from "@/lib/scoring/types";
import { STANDARD_WEIGHTS } from "@/lib/scoring/types";

/**
 * Loan Utilization & Behavior Dimension
 *
 * Evaluates how responsibly a member uses loan products:
 * - Purpose alignment (0-20 pts)
 * - Loan-to-CBU ratio (0-25 pts)
 * - Multi-loan management (0-20 pts)
 * - Early repayment (0-15 pts)
 * - Loan cycling (0-20 pts)
 *
 * Weight: 10 (standard) / 0 (thin-file)
 */
export async function scoreLoanUtilization(
  memberId: string,
): Promise<DimensionScore> {
  const subScores: SubScore[] = [];

  // Fetch member with employment type
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { employmentType: true },
  });

  // Fetch all loans for the member
  const loans = await prisma.loan.findMany({
    where: { memberId },
    orderBy: { applicationDate: "asc" },
  });

  // --- Sub-score 1: Purpose alignment (0-20 pts) ---
  let purposePoints = 0;
  let purposeDetails: string;

  if (loans.length === 0) {
    purposePoints = 0;
    purposeDetails = "No loans found";
  } else {
    // Check if purpose field is non-empty and has >10 chars as a proxy for specificity
    const specificPurposeCount = loans.filter(
      (l) => l.purpose && l.purpose.length > 10,
    ).length;
    const ratio = specificPurposeCount / loans.length;

    if (ratio >= 0.8) {
      purposePoints = 20;
      purposeDetails = `${specificPurposeCount}/${loans.length} loans have specific purposes — well-aligned`;
    } else if (ratio >= 0.5) {
      purposePoints = 12;
      purposeDetails = `${specificPurposeCount}/${loans.length} loans have specific purposes — mixed alignment`;
    } else {
      purposePoints = 5;
      purposeDetails = `${specificPurposeCount}/${loans.length} loans have specific purposes — mostly vague`;
    }
  }

  subScores.push({
    name: "Purpose alignment",
    value: purposePoints,
    maxPoints: 20,
    details: purposeDetails,
  });

  // --- Sub-score 2: Loan-to-CBU ratio (0-25 pts) ---
  let loanCbuPoints = 0;
  let loanCbuDetails: string;

  // Get total outstanding loan principal (active loans)
  const activeLoans = loans.filter(
    (l) => l.status === "CURRENT" || l.status === "RELEASED",
  );
  const totalOutstanding = activeLoans.reduce(
    (sum, l) => sum + Number(l.principalAmount),
    0,
  );

  // Get latest ShareCapital running balance (CBU)
  const latestShareCapital = await prisma.shareCapital.findFirst({
    where: { memberId },
    orderBy: { transactionDate: "desc" },
    select: { runningBalance: true },
  });

  const cbuBalance = latestShareCapital
    ? Number(latestShareCapital.runningBalance)
    : 0;

  if (cbuBalance <= 0) {
    loanCbuPoints = 0;
    loanCbuDetails = "No CBU balance on record";
  } else if (totalOutstanding === 0) {
    loanCbuPoints = 25;
    loanCbuDetails = "No outstanding loans against CBU";
  } else {
    const ratio = totalOutstanding / cbuBalance;

    if (ratio < 2) {
      loanCbuPoints = 25;
      loanCbuDetails = `Loan-to-CBU ratio: ${ratio.toFixed(1)}x (< 2x)`;
    } else if (ratio < 3) {
      loanCbuPoints = 18;
      loanCbuDetails = `Loan-to-CBU ratio: ${ratio.toFixed(1)}x (2-3x)`;
    } else if (ratio < 5) {
      loanCbuPoints = 10;
      loanCbuDetails = `Loan-to-CBU ratio: ${ratio.toFixed(1)}x (3-5x)`;
    } else {
      loanCbuPoints = 0;
      loanCbuDetails = `Loan-to-CBU ratio: ${ratio.toFixed(1)}x (> 5x)`;
    }
  }

  subScores.push({
    name: "Loan-to-CBU ratio",
    value: loanCbuPoints,
    maxPoints: 25,
    details: loanCbuDetails,
  });

  // --- Sub-score 3: Multi-loan management (0-20 pts) ---
  const activeLoanCount = activeLoans.length;
  let multiLoanPoints: number;
  let multiLoanDetails: string;

  if (activeLoanCount <= 1) {
    multiLoanPoints = 20;
    multiLoanDetails = `${activeLoanCount} active loan(s) — well managed`;
  } else if (activeLoanCount === 2) {
    multiLoanPoints = 15;
    multiLoanDetails = "2 active loans — moderate exposure";
  } else if (activeLoanCount === 3) {
    multiLoanPoints = 5;
    multiLoanDetails = "3 active loans — high exposure";
  } else {
    multiLoanPoints = 0;
    multiLoanDetails = `${activeLoanCount} active loans — excessive exposure`;
  }

  subScores.push({
    name: "Multi-loan management",
    value: multiLoanPoints,
    maxPoints: 20,
    details: multiLoanDetails,
  });

  // --- Sub-score 4: Early repayment (0-15 pts) ---
  let earlyRepaymentPoints = 0;
  let earlyRepaymentDetails: string;

  const paidLoans = loans.filter((l) => l.status === "PAID");

  if (paidLoans.length === 0) {
    earlyRepaymentPoints = 0;
    earlyRepaymentDetails = "No completed loans to evaluate";
  } else {
    // Check if any loans were paid before maturity date
    // We use the latest payment date on each loan to determine completion time
    const earlyPaidLoans: typeof paidLoans = [];
    const lateLoans: typeof paidLoans = [];

    for (const loan of paidLoans) {
      const lastPayment = await prisma.loanPayment.findFirst({
        where: { loanId: loan.id },
        orderBy: { paymentDate: "desc" },
        select: { paymentDate: true },
      });

      if (lastPayment?.paymentDate && lastPayment.paymentDate < loan.maturityDate) {
        earlyPaidLoans.push(loan);
      } else if (lastPayment?.paymentDate && lastPayment.paymentDate > loan.maturityDate) {
        lateLoans.push(loan);
      }
    }

    if (earlyPaidLoans.length > 0) {
      earlyRepaymentPoints = 15;
      earlyRepaymentDetails = `${earlyPaidLoans.length} loan(s) repaid early`;
    } else if (lateLoans.length === 0) {
      earlyRepaymentPoints = 10;
      earlyRepaymentDetails = "All loans repaid on time";
    } else {
      earlyRepaymentPoints = 0;
      earlyRepaymentDetails = `${lateLoans.length} loan(s) repaid late`;
    }
  }

  subScores.push({
    name: "Early repayment",
    value: earlyRepaymentPoints,
    maxPoints: 15,
    details: earlyRepaymentDetails,
  });

  // --- Sub-score 5: Loan cycling (0-20 pts) ---
  let cyclingPoints = 0;
  let cyclingDetails: string;

  if (loans.length <= 1) {
    cyclingPoints = 10;
    cyclingDetails = loans.length === 0
      ? "No prior loans to evaluate"
      : "Only 1 loan — no cycling pattern";
  } else {
    // Calculate average gap between consecutive loan application dates
    const applicationDates = loans
      .map((l) => l.applicationDate.getTime())
      .sort((a, b) => a - b);

    let totalGapMs = 0;
    for (let i = 1; i < applicationDates.length; i++) {
      totalGapMs += applicationDates[i] - applicationDates[i - 1];
    }

    const avgGapMs = totalGapMs / (applicationDates.length - 1);
    const avgGapMonths = avgGapMs / (1000 * 60 * 60 * 24 * 30);

    if (avgGapMonths > 6) {
      cyclingPoints = 20;
      cyclingDetails = `Average gap: ${avgGapMonths.toFixed(1)} months (> 6 months)`;
    } else if (avgGapMonths >= 3) {
      cyclingPoints = 12;
      cyclingDetails = `Average gap: ${avgGapMonths.toFixed(1)} months (3-6 months)`;
    } else if (avgGapMonths >= 1) {
      cyclingPoints = 5;
      cyclingDetails = `Average gap: ${avgGapMonths.toFixed(1)} months (1-3 months)`;
    } else {
      cyclingPoints = 0;
      cyclingDetails = `Average gap: ${avgGapMonths.toFixed(1)} months — rapid cycling detected`;
    }
  }

  subScores.push({
    name: "Loan cycling",
    value: cyclingPoints,
    maxPoints: 20,
    details: cyclingDetails,
  });

  // --- Calculate total dimension score (0-100) ---
  const rawScore = subScores.reduce((sum, s) => sum + s.value, 0);
  const weight = STANDARD_WEIGHTS.loanUtilization;

  return {
    dimension: "Loan Utilization & Behavior",
    score: rawScore,
    weight,
    weightedScore: (rawScore * weight) / 100,
    subScores,
  };
}

export default scoreLoanUtilization;
