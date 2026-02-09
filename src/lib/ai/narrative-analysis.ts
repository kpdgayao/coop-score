import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai/client";
import {
  NarrativeAssessmentSchema,
  parseAIResponse,
  type NarrativeAssessment,
} from "@/lib/ai/schemas";

const FEATURE_NAME = "narrative-analysis";

// Cost estimate: ~500 input tokens + ~300 output tokens per call
const COST_PER_INPUT_TOKEN = 0.000003; // $3 per 1M input tokens (Sonnet)
const COST_PER_OUTPUT_TOKEN = 0.000015; // $15 per 1M output tokens (Sonnet)

function buildSystemPrompt(): string {
  return `You are a credit analyst for a Philippine cooperative. Analyze the following loan application narrative and member profile. Assess the loan purpose for:
1. Clarity and specificity (vague = higher risk)
2. Alignment with the member's employment/income profile
3. Realistic scope given the loan amount requested
4. Productive vs. consumptive purpose
5. Any red flags or inconsistencies

Return ONLY a JSON object with the following fields:
- score (number 0-100, where 100 = excellent purpose clarity and alignment)
- risk_level ("low" | "medium" | "high")
- flags (string[] - list of any red flags or concerns)
- reasoning (string - your detailed assessment reasoning)
- purpose_category (string - auto-classified category, e.g. "livelihood", "education", "emergency", "consumption", "business_expansion", "agriculture", "housing")
- alignment_with_profile ("strong" | "moderate" | "weak" | "misaligned")

Do NOT include any text outside the JSON object.`;
}

function buildUserPrompt(
  member: {
    employmentType: string;
    employerOrBusiness: string | null;
    monthlyIncome: number;
    membershipDate: Date;
  },
  loan: {
    principalAmount: number;
    purpose: string;
    loanType: string;
  },
  previousPurposes: string[]
): string {
  const tenureMonths = Math.floor(
    (Date.now() - member.membershipDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  return `Member Profile:
- Employment: ${member.employmentType}
- Business/Employer: ${member.employerOrBusiness || "N/A"}
- Monthly Income: PHP ${Number(member.monthlyIncome).toLocaleString("en-PH")}
- Membership Tenure: ${tenureMonths} months
- Previous Loan Purposes: ${previousPurposes.length > 0 ? previousPurposes.join("; ") : "None (first-time borrower)"}

Loan Application:
- Amount Requested: PHP ${Number(loan.principalAmount).toLocaleString("en-PH")}
- Stated Purpose: "${loan.purpose}"
- Loan Type: ${loan.loanType}`;
}

/**
 * Analyzes a loan application's stated purpose using AI.
 * Returns null on AI failure (graceful degradation).
 */
export async function analyzeNarrative(
  loanId: string
): Promise<NarrativeAssessment | null> {
  try {
    // Query loan with member data
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        member: true,
      },
    });

    if (!loan) {
      console.error(`[${FEATURE_NAME}] Loan not found: ${loanId}`);
      return null;
    }

    // Get previous loan purposes for this member
    const previousLoans = await prisma.loan.findMany({
      where: {
        memberId: loan.memberId,
        id: { not: loanId },
      },
      select: { purpose: true },
      orderBy: { applicationDate: "desc" },
      take: 5,
    });

    const previousPurposes = previousLoans.map((l) => l.purpose);

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      { ...loan.member, monthlyIncome: Number(loan.member.monthlyIncome) },
      { ...loan, principalAmount: Number(loan.principalAmount) },
      previousPurposes
    );

    // Call AI
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
    });

    // Parse and validate
    const assessment = parseAIResponse(
      aiResponse.content,
      NarrativeAssessmentSchema
    );

    // Log the API call
    const costEstimate =
      aiResponse.promptTokens * COST_PER_INPUT_TOKEN +
      aiResponse.completionTokens * COST_PER_OUTPUT_TOKEN;

    await prisma.aIApiLog.create({
      data: {
        feature: FEATURE_NAME,
        promptTokens: aiResponse.promptTokens,
        completionTokens: aiResponse.completionTokens,
        latencyMs: aiResponse.latencyMs,
        costEstimate: parseFloat(costEstimate.toFixed(6)),
        success: true,
      },
    });

    // Save result to loan record
    await prisma.loan.update({
      where: { id: loanId },
      data: {
        narrativeAssessment: assessment as object,
      },
    });

    return assessment;
  } catch (error) {
    console.error(`[${FEATURE_NAME}] Error analyzing narrative for loan ${loanId}:`, error);

    // Log the failed API call
    try {
      await prisma.aIApiLog.create({
        data: {
          feature: FEATURE_NAME,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: 0,
          costEstimate: 0,
          success: false,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        },
      });
    } catch (logError) {
      console.error(`[${FEATURE_NAME}] Failed to log API error:`, logError);
    }

    // Graceful degradation: return null instead of throwing
    return null;
  }
}
