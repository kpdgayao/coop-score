export interface DimensionScore {
  dimension: string;
  score: number; // 0-100
  weight: number; // percentage weight
  weightedScore: number; // score * weight / 100
  subScores: SubScore[];
}

export interface SubScore {
  name: string;
  value: number;
  maxPoints: number;
  details: string;
}

export interface ScoringResult {
  memberId: string;
  totalScore: number; // 300-850
  riskCategory: RiskCategory;
  scoringPathway: "STANDARD" | "THIN_FILE";
  dimensions: DimensionScore[];
  computedAt: Date;
  modelVersion: string;
}

export type RiskCategory = "EXCELLENT" | "GOOD" | "FAIR" | "MARGINAL" | "HIGH_RISK";

export function getRiskCategory(score: number): RiskCategory {
  if (score >= 750) return "EXCELLENT";
  if (score >= 650) return "GOOD";
  if (score >= 550) return "FAIR";
  if (score >= 450) return "MARGINAL";
  return "HIGH_RISK";
}

export function mapToScoreRange(rawScore: number): number {
  // Maps 0-100 internal scale to 300-850 output range
  const clamped = Math.max(0, Math.min(100, rawScore));
  return Math.round(300 + (clamped / 100) * 550);
}

export const STANDARD_WEIGHTS = {
  repaymentHistory: 25,
  capitalBuildup: 20,
  cooperativeEngagement: 20,
  membershipMaturity: 10,
  loanUtilization: 10,
  guarantorNetwork: 10,
  demographics: 5,
} as const;

// For thin-file members: no repayment history or loan utilization
export const THIN_FILE_WEIGHTS = {
  repaymentHistory: 0,
  capitalBuildup: 28,
  cooperativeEngagement: 30,
  membershipMaturity: 15,
  loanUtilization: 0,
  guarantorNetwork: 17,
  demographics: 10,
} as const;

// Score ceiling for thin-file: 699
export const THIN_FILE_CEILING = 699;

export interface ProgressiveLadderStage {
  stage: string;
  loanCeiling: { min: number; max: number };
  requirements: string[];
  graduationCriteria: string[];
}

export const PROGRESSIVE_LADDER: ProgressiveLadderStage[] = [
  {
    stage: "Entry",
    loanCeiling: { min: 5000, max: 10000 },
    requirements: [
      "3 months membership",
      "PMES completed",
      "1 guarantor",
    ],
    graduationCriteria: ["Full repayment within term"],
  },
  {
    stage: "Level 2",
    loanCeiling: { min: 10000, max: 25000 },
    requirements: [
      "Entry loan repaid",
      "6+ months membership",
    ],
    graduationCriteria: ["On-time repayment", "No restructuring"],
  },
  {
    stage: "Level 3",
    loanCeiling: { min: 25000, max: 50000 },
    requirements: [
      "Level 2 completed",
      "1+ year membership",
      "2 guarantors",
    ],
    graduationCriteria: ["Consistent savings", "Full repayment"],
  },
  {
    stage: "Standard",
    loanCeiling: { min: 50000, max: 500000 },
    requirements: ["Full scoring model applies"],
    graduationCriteria: ["Has repayment history"],
  },
];
