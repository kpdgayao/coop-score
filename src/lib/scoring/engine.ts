import { prisma } from "@/lib/db";
import type { DimensionScore, ScoringResult } from "@/lib/scoring/types";
import {
  STANDARD_WEIGHTS,
  THIN_FILE_WEIGHTS,
  THIN_FILE_CEILING,
  getRiskCategory,
  mapToScoreRange,
} from "@/lib/scoring/types";
import { scoreRepaymentHistory } from "@/lib/scoring/dimensions/repayment-history";
import { scoreCapitalBuildup } from "@/lib/scoring/dimensions/capital-buildup";
import { scoreCooperativeEngagement } from "@/lib/scoring/dimensions/cooperative-engagement";
import { scoreMembershipMaturity } from "@/lib/scoring/dimensions/membership-maturity";
import { scoreLoanUtilization } from "@/lib/scoring/dimensions/loan-utilization";
import { scoreGuarantorNetwork } from "@/lib/scoring/dimensions/guarantor-network";
import { scoreDemographics } from "@/lib/scoring/dimensions/demographics";

const MODEL_VERSION = "1.0";

/**
 * Dimension keys mapped to their weight keys for applying the correct weight set.
 */
const DIMENSION_WEIGHT_KEYS: Record<string, keyof typeof STANDARD_WEIGHTS> = {
  "Repayment History": "repaymentHistory",
  "Capital Build-Up Behavior": "capitalBuildup",
  "Cooperative Engagement & Social Capital": "cooperativeEngagement",
  "Membership Maturity & Stability": "membershipMaturity",
  "Loan Utilization & Behavior": "loanUtilization",
  "Guarantor Network Quality": "guarantorNetwork",
  "Demographics & External Factors": "demographics",
};

/**
 * Determines if a member is a thin-file member by checking whether they
 * have any loan with repayment history (status: PAID, CURRENT, DELINQUENT,
 * DEFAULT, or RESTRUCTURED).
 */
async function checkThinFile(memberId: string): Promise<boolean> {
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
 * Computes the credit score for a member across all 7 dimensions.
 *
 * 1. Determines thin-file status
 * 2. Runs all 7 dimension scoring functions in parallel
 * 3. Applies appropriate weights (STANDARD_WEIGHTS or THIN_FILE_WEIGHTS)
 * 4. Maps weighted total to 300-850 score range
 * 5. Caps thin-file members at THIN_FILE_CEILING
 */
export async function computeMemberScore(
  memberId: string,
): Promise<ScoringResult> {
  // Step 1: Determine thin-file status
  const isThinFile = await checkThinFile(memberId);
  const weights = isThinFile ? THIN_FILE_WEIGHTS : STANDARD_WEIGHTS;

  // Step 2: Run all dimension scoring functions in parallel
  const [
    repaymentHistory,
    capitalBuildup,
    cooperativeEngagement,
    membershipMaturity,
    loanUtilization,
    guarantorNetwork,
    demographics,
  ] = await Promise.all([
    scoreRepaymentHistory(memberId),
    scoreCapitalBuildup(memberId),
    scoreCooperativeEngagement(memberId),
    scoreMembershipMaturity(memberId),
    scoreLoanUtilization(memberId),
    scoreGuarantorNetwork(memberId),
    scoreDemographics(memberId),
  ]);

  // Step 3: Apply weights based on scoring pathway
  const rawDimensions: DimensionScore[] = [
    repaymentHistory,
    capitalBuildup,
    cooperativeEngagement,
    membershipMaturity,
    loanUtilization,
    guarantorNetwork,
    demographics,
  ];

  const dimensions: DimensionScore[] = rawDimensions.map((dim) => {
    const weightKey = DIMENSION_WEIGHT_KEYS[dim.dimension];
    const weight = weightKey ? weights[weightKey] : 0;
    const weightedScore = (dim.score * weight) / 100;

    return {
      ...dim,
      weight,
      weightedScore,
    };
  });

  // Step 4: Compute total weighted score (0-100 internal) and map to 300-850
  const totalWeightedRaw = dimensions.reduce(
    (sum, dim) => sum + dim.weightedScore,
    0,
  );

  let totalScore = mapToScoreRange(totalWeightedRaw);

  // Step 5: Cap thin-file members at THIN_FILE_CEILING
  if (isThinFile && totalScore > THIN_FILE_CEILING) {
    totalScore = THIN_FILE_CEILING;
  }

  const riskCategory = getRiskCategory(totalScore);

  return {
    memberId,
    totalScore,
    riskCategory,
    scoringPathway: isThinFile ? "THIN_FILE" : "STANDARD",
    dimensions,
    computedAt: new Date(),
    modelVersion: MODEL_VERSION,
  };
}

/**
 * Computes the credit score for a member and persists it to the database.
 *
 * 1. Calls computeMemberScore to generate the full scoring result
 * 2. Saves the result to the CreditScore table
 * 3. Returns the scoring result
 */
export async function computeAndSaveScore(
  memberId: string,
): Promise<ScoringResult> {
  const result = await computeMemberScore(memberId);

  await prisma.creditScore.create({
    data: {
      memberId: result.memberId,
      scoreDate: result.computedAt,
      totalScore: result.totalScore,
      riskCategory: result.riskCategory,
      scoringPathway: result.scoringPathway,
      dimensionScores: JSON.parse(JSON.stringify(result.dimensions)),
      modelVersion: result.modelVersion,
      computedBy: "SYSTEM",
    },
  });

  return result;
}
