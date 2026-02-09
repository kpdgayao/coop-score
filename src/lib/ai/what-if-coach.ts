import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai/client";
import {
  CoachingResponseSchema,
  parseAIResponse,
  type CoachingResponse,
} from "@/lib/ai/schemas";

const FEATURE_NAME = "what-if-coach";

// Cost estimate: ~600 input tokens + ~400 output tokens per call
const COST_PER_INPUT_TOKEN = 0.000003;
const COST_PER_OUTPUT_TOKEN = 0.000015;

/**
 * Represents a single simulated action and its projected score impact.
 */
export interface SimulationResult {
  action: string;
  projectedScoreChange: number;
  newScore: number;
}

function buildSystemPrompt(): string {
  return `You are a financial coach at a Philippine cooperative. A member has used the credit score simulator and you need to provide personalized, actionable advice.

Provide a personalized coaching message that:
1. Prioritizes the 2-3 highest-impact actions the member can realistically take
2. Gives specific timelines (e.g., "By attending the next General Assembly on...")
3. If they're close to a tier boundary, highlight what it takes to cross it
4. Frame improvements in terms of loan eligibility (e.g., "This would qualify you for up to PHP 25,000")
5. Keep it encouraging and aligned with cooperative values

Score Tiers:
- 750-850: Excellent — Auto-approve up to 5x CBU, lowest interest tier
- 650-749: Good — Standard approval up to 3x CBU
- 550-649: Fair — Credit committee review required, max 2x CBU
- 450-549: Marginal — Enhanced due diligence, max 1x CBU
- 300-449: High Risk — Decline or require restructuring

Return ONLY a JSON object with:
- coaching_message (string - a warm, encouraging coaching message in 3-5 sentences, written for the member to read directly)
- priority_actions (array of objects, each with: action (string), projected_impact (string), timeline (string), feasibility (string))
- next_milestone (object with: target_tier (string), current_score (number), target_score (number), actions_needed (string[]))

Do NOT include any text outside the JSON object.`;
}

function buildUserPrompt(
  member: {
    firstName: string;
    lastName: string;
    employmentType: string;
    monthlyIncome: number;
  },
  currentScore: number,
  riskCategory: string,
  simulationResults: SimulationResult[]
): string {
  return `Member: ${member.firstName} ${member.lastName}
Current Score: ${currentScore}/850 (${riskCategory})
Employment: ${member.employmentType}
Monthly Income: PHP ${Number(member.monthlyIncome).toLocaleString("en-PH")}

Simulation Results:
${JSON.stringify(simulationResults, null, 2)}`;
}

function getRiskCategory(score: number): string {
  if (score >= 750) return "Excellent";
  if (score >= 650) return "Good";
  if (score >= 550) return "Fair";
  if (score >= 450) return "Marginal";
  return "High Risk";
}

/**
 * Generates personalized coaching advice based on what-if simulation results.
 * This is read-only -- results are NOT saved to the database.
 * Returns null on AI failure (graceful degradation).
 */
export async function getCoaching(
  memberId: string,
  simulationResults: SimulationResult[]
): Promise<CoachingResponse | null> {
  try {
    // Query member data and latest credit score
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        firstName: true,
        lastName: true,
        employmentType: true,
        monthlyIncome: true,
      },
    });

    if (!member) {
      console.error(`[${FEATURE_NAME}] Member not found: ${memberId}`);
      return null;
    }

    // Get the latest credit score for this member
    const latestScore = await prisma.creditScore.findFirst({
      where: { memberId },
      orderBy: { scoreDate: "desc" },
      select: {
        totalScore: true,
        riskCategory: true,
      },
    });

    if (!latestScore) {
      console.error(
        `[${FEATURE_NAME}] No credit score found for member: ${memberId}`
      );
      return null;
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      { ...member, monthlyIncome: Number(member.monthlyIncome) },
      latestScore.totalScore,
      latestScore.riskCategory,
      simulationResults
    );

    // Call AI
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
    });

    // Parse and validate
    const coaching = parseAIResponse(
      aiResponse.content,
      CoachingResponseSchema
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

    // NOTE: Coaching responses are NOT saved to the database.
    // They are read-only projections returned directly to the caller.

    return coaching;
  } catch (error) {
    console.error(
      `[${FEATURE_NAME}] Error generating coaching for member ${memberId}:`,
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
