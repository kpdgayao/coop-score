import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai/client";
import {
  ScoreExplanationSchema,
  parseAIResponse,
  type ScoreExplanation,
} from "@/lib/ai/schemas";

const FEATURE_NAME = "score-explainer";

// Cost estimate: ~800 input tokens + ~500 output tokens per call
const COST_PER_INPUT_TOKEN = 0.000003;
const COST_PER_OUTPUT_TOKEN = 0.000015;

function buildSystemPrompt(): string {
  return `You are a senior credit analyst at a Philippine cooperative (Oro Integrated Cooperative). Write a concise credit assessment memo based on the following score breakdown. Write in professional but accessible language — the audience is a credit committee composed of cooperative officers, not data scientists.

Return ONLY a JSON object with the following fields:
- narrative (string - a 3-5 sentence credit assessment memo highlighting key factors)
- strengths (string[] - top 2-3 positive factors)
- concerns (string[] - top 2-3 risk factors, or empty array if none)
- recommendation ("approve" | "approve_with_conditions" | "review" | "decline")
- suggested_max_amount (number - recommended maximum loan amount in PHP based on score tier and CBU)
- conditions (string[] - any conditions for approval, e.g. "Require 2 guarantors", "Limit to 12-month term")
- improvement_tips (string[] - actionable steps the member can take to improve their score)

For thin-file members, explicitly explain why the alternative scoring pathway was used and what the member can do to build their credit profile.
For members near a score threshold boundary (e.g., 545 vs 555), call this out so the credit officer can apply judgment.

Do NOT include any text outside the JSON object.`;
}

function buildUserPrompt(
  member: {
    firstName: string;
    lastName: string;
    membershipNumber: string;
    membershipDate: Date;
    employmentType: string;
    monthlyIncome: number;
  },
  creditScore: {
    totalScore: number;
    riskCategory: string;
    scoringPathway: string;
    dimensionScores: unknown;
  }
): string {
  const dimensionScores = creditScore.dimensionScores as Array<{
    dimension: string;
    score: number;
    weight: number;
    subScores?: Array<{ name: string; value: number; maxPoints: number; details: string }>;
  }>;

  let dimensionBreakdown = "";
  if (Array.isArray(dimensionScores)) {
    dimensionBreakdown = dimensionScores
      .map((d, i) => {
        let entry = `${i + 1}. ${d.dimension}: ${d.score}/100 (weight: ${d.weight}%)`;
        if (d.subScores && Array.isArray(d.subScores)) {
          d.subScores.forEach((sub) => {
            entry += `\n   - ${sub.name}: ${sub.value}/${sub.maxPoints} — ${sub.details}`;
          });
        }
        return entry;
      })
      .join("\n");
  } else {
    dimensionBreakdown = JSON.stringify(dimensionScores, null, 2);
  }

  return `Member: ${member.firstName} ${member.lastName} (Member #${member.membershipNumber})
Membership Since: ${member.membershipDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
Employment: ${member.employmentType}
Monthly Income: PHP ${Number(member.monthlyIncome).toLocaleString("en-PH")}
Scoring Pathway: ${creditScore.scoringPathway}

Overall Score: ${creditScore.totalScore}/850 — ${creditScore.riskCategory}

Dimension Breakdown:
${dimensionBreakdown}`;
}

/**
 * Generates a natural language credit assessment memo for a computed credit score.
 * Returns null on AI failure (graceful degradation).
 */
export async function explainScore(
  creditScoreId: string
): Promise<ScoreExplanation | null> {
  try {
    // Query credit score with member data
    const creditScore = await prisma.creditScore.findUnique({
      where: { id: creditScoreId },
      include: {
        member: true,
      },
    });

    if (!creditScore) {
      console.error(`[${FEATURE_NAME}] CreditScore not found: ${creditScoreId}`);
      return null;
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      { ...creditScore.member, monthlyIncome: Number(creditScore.member.monthlyIncome) },
      {
      totalScore: creditScore.totalScore,
      riskCategory: creditScore.riskCategory,
      scoringPathway: creditScore.scoringPathway,
      dimensionScores: creditScore.dimensionScores,
    });

    // Call AI
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
    });

    // Parse and validate
    const explanation = parseAIResponse(
      aiResponse.content,
      ScoreExplanationSchema
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

    // Save to creditScore.recommendations
    await prisma.creditScore.update({
      where: { id: creditScoreId },
      data: {
        recommendations: explanation as object,
      },
    });

    return explanation;
  } catch (error) {
    console.error(
      `[${FEATURE_NAME}] Error explaining score ${creditScoreId}:`,
      error
    );

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

    // Graceful degradation
    return null;
  }
}
