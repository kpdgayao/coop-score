import { prisma } from "@/lib/db";
import type { DimensionScore, SubScore } from "@/lib/scoring/types";
import { STANDARD_WEIGHTS } from "@/lib/scoring/types";

/**
 * Demographics & External Factors Dimension
 *
 * Evaluates external demographic factors:
 * - Age factor (0-25 pts)
 * - Employment stability (0-35 pts)
 * - Income level (0-25 pts)
 * - Geographic proximity (0-15 pts)
 *
 * Weight: 5 (standard) / 10 (thin-file)
 */
export async function scoreDemographics(
  memberId: string,
): Promise<DimensionScore> {
  const subScores: SubScore[] = [];

  // Fetch member data
  const member = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    select: {
      dateOfBirth: true,
      employmentType: true,
      monthlyIncome: true,
      city: true,
      province: true,
    },
  });

  // --- Sub-score 1: Age factor (0-25 pts) ---
  const now = new Date();
  const birthDate = new Date(member.dateOfBirth);
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }

  let agePoints: number;
  let ageDetails: string;

  if (age >= 30 && age <= 55) {
    agePoints = 25;
    ageDetails = `Age ${age} — peak earning years (30-55)`;
  } else if ((age >= 25 && age <= 29) || (age >= 56 && age <= 65)) {
    agePoints = 18;
    ageDetails = `Age ${age} — productive years (25-29 or 56-65)`;
  } else if (age >= 18 && age <= 24) {
    agePoints = 12;
    ageDetails = `Age ${age} — early career (18-24)`;
  } else {
    agePoints = 10;
    ageDetails = `Age ${age} — senior (65+)`;
  }

  subScores.push({
    name: "Age factor",
    value: agePoints,
    maxPoints: 25,
    details: ageDetails,
  });

  // --- Sub-score 2: Employment stability (0-35 pts) ---
  let employmentPoints: number;
  let employmentDetails: string;

  switch (member.employmentType) {
    case "EMPLOYED":
      employmentPoints = 35;
      employmentDetails = "Employed — highest income stability";
      break;
    case "BUSINESS_OWNER":
      employmentPoints = 30;
      employmentDetails = "Business owner — strong income potential";
      break;
    case "SELF_EMPLOYED":
      employmentPoints = 22;
      employmentDetails = "Self-employed — moderate stability";
      break;
    case "FARMER":
      employmentPoints = 18;
      employmentDetails = "Farmer — seasonal income variability";
      break;
    case "UNEMPLOYED":
      employmentPoints = 0;
      employmentDetails = "Unemployed — no stable income source";
      break;
    default:
      employmentPoints = 0;
      employmentDetails = `Unknown employment type: ${member.employmentType}`;
  }

  subScores.push({
    name: "Employment stability",
    value: employmentPoints,
    maxPoints: 35,
    details: employmentDetails,
  });

  // --- Sub-score 3: Income level (0-25 pts) ---
  const monthlyIncome = Number(member.monthlyIncome);
  let incomePoints: number;
  let incomeDetails: string;

  if (monthlyIncome > 30000) {
    incomePoints = 25;
    incomeDetails = `Monthly income: PHP ${monthlyIncome.toLocaleString()} (> 30,000)`;
  } else if (monthlyIncome >= 20000) {
    incomePoints = 20;
    incomeDetails = `Monthly income: PHP ${monthlyIncome.toLocaleString()} (20,000-30,000)`;
  } else if (monthlyIncome >= 15000) {
    incomePoints = 15;
    incomeDetails = `Monthly income: PHP ${monthlyIncome.toLocaleString()} (15,000-20,000)`;
  } else if (monthlyIncome >= 10000) {
    incomePoints = 10;
    incomeDetails = `Monthly income: PHP ${monthlyIncome.toLocaleString()} (10,000-15,000)`;
  } else if (monthlyIncome >= 5000) {
    incomePoints = 5;
    incomeDetails = `Monthly income: PHP ${monthlyIncome.toLocaleString()} (5,000-10,000)`;
  } else {
    incomePoints = 0;
    incomeDetails = `Monthly income: PHP ${monthlyIncome.toLocaleString()} (< 5,000)`;
  }

  subScores.push({
    name: "Income level",
    value: incomePoints,
    maxPoints: 25,
    details: incomeDetails,
  });

  // --- Sub-score 4: Geographic proximity (0-15 pts) ---
  let geoPoints: number;
  let geoDetails: string;

  const cityLower = member.city.toLowerCase().trim();
  const provinceLower = member.province.toLowerCase().trim();

  if (cityLower === "cagayan de oro") {
    geoPoints = 15;
    geoDetails = "Located in Cagayan de Oro — cooperative headquarters";
  } else if (provinceLower === "misamis oriental") {
    geoPoints = 10;
    geoDetails = `Located in ${member.city} — same province`;
  } else {
    geoPoints = 5;
    geoDetails = `Located in ${member.city}, ${member.province} — outside province`;
  }

  subScores.push({
    name: "Geographic proximity",
    value: geoPoints,
    maxPoints: 15,
    details: geoDetails,
  });

  // --- Calculate total dimension score (0-100) ---
  const rawScore = subScores.reduce((sum, s) => sum + s.value, 0);
  const weight = STANDARD_WEIGHTS.demographics;

  return {
    dimension: "Demographics & External Factors",
    score: rawScore,
    weight,
    weightedScore: (rawScore * weight) / 100,
    subScores,
  };
}

export default scoreDemographics;
