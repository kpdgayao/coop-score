import { z } from "zod";

// ==================== AI Feature 1: Narrative Assessment ====================

export const NarrativeAssessmentSchema = z.object({
  score: z.number().min(0).max(100),
  risk_level: z.enum(["low", "medium", "high"]),
  flags: z.array(z.string()),
  reasoning: z.string(),
  purpose_category: z.string(),
  alignment_with_profile: z.enum(["strong", "moderate", "weak", "misaligned"]),
});

export type NarrativeAssessment = z.infer<typeof NarrativeAssessmentSchema>;

// ==================== AI Feature 2: Score Explanation ====================

export const ScoreExplanationSchema = z.object({
  narrative: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  recommendation: z.enum([
    "approve",
    "approve_with_conditions",
    "review",
    "decline",
  ]),
  suggested_max_amount: z.number(),
  conditions: z.array(z.string()),
  improvement_tips: z.array(z.string()),
});

export type ScoreExplanation = z.infer<typeof ScoreExplanationSchema>;

// ==================== AI Feature 3: Anomaly Detection ====================

export const AnomalyAlertResultSchema = z.array(
  z.object({
    alertType: z.enum([
      "withdrawal_spike",
      "attendance_drop",
      "household_cluster",
      "guarantor_concentration",
      "manufactured_pattern",
      "rapid_loan_cycling",
      "other",
    ]),
    severity: z.enum(["low", "medium", "high"]),
    description: z.string(),
    evidence: z.record(z.string(), z.unknown()),
  })
);

export type AnomalyAlertResult = z.infer<typeof AnomalyAlertResultSchema>;

// ==================== AI Feature 4: Interview Assessment ====================

export const InterviewAssessmentSchema = z.object({
  overall_score: z.number().min(0).max(100),
  financial_literacy_score: z.number().min(0).max(100),
  business_viability_score: z.number().min(0).max(100),
  coherence_score: z.number().min(0).max(100),
  risk_flags: z.array(z.string()),
  summary: z.string(),
  recommendation: z.string(),
});

export type InterviewAssessment = z.infer<typeof InterviewAssessmentSchema>;

// ==================== AI Feature 5: Coaching Response ====================

export const CoachingResponseSchema = z.object({
  coaching_message: z.string(),
  priority_actions: z.array(
    z.object({
      action: z.string(),
      projected_impact: z.string(),
      timeline: z.string(),
      feasibility: z.string(),
    })
  ),
  next_milestone: z.object({
    target_tier: z.string(),
    current_score: z.number(),
    target_score: z.number(),
    actions_needed: z.array(z.string()),
  }),
});

export type CoachingResponse = z.infer<typeof CoachingResponseSchema>;

// ==================== Helper: Parse and Validate AI Response ====================

/**
 * Extracts JSON from AI response content (handles markdown code blocks),
 * parses it, and validates against a Zod schema.
 *
 * @throws {Error} if JSON cannot be extracted, parsed, or validated
 */
export function parseAIResponse<T>(content: string, schema: z.ZodType<T>): T {
  const jsonString = extractJSON(content);
  const parsed = JSON.parse(jsonString);
  return schema.parse(parsed);
}

/**
 * Extracts JSON from a string that may contain markdown code blocks
 * or other surrounding text.
 */
function extractJSON(content: string): string {
  // Try to extract from markdown code block first (```json ... ``` or ``` ... ```)
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find a JSON object or array directly
  const jsonObjectMatch = content.match(/(\{[\s\S]*\})/);
  const jsonArrayMatch = content.match(/(\[[\s\S]*\])/);

  if (jsonObjectMatch && jsonArrayMatch) {
    // Return whichever appears first in the content
    const objectIndex = content.indexOf(jsonObjectMatch[1]);
    const arrayIndex = content.indexOf(jsonArrayMatch[1]);
    return objectIndex < arrayIndex
      ? jsonObjectMatch[1].trim()
      : jsonArrayMatch[1].trim();
  }

  if (jsonObjectMatch) {
    return jsonObjectMatch[1].trim();
  }

  if (jsonArrayMatch) {
    return jsonArrayMatch[1].trim();
  }

  // As a last resort, return the content as-is and let JSON.parse handle the error
  return content.trim();
}
