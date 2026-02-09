import { prisma } from "@/lib/db";
import { callAI, callAIStreaming } from "@/lib/ai/client";
import {
  InterviewAssessmentSchema,
  parseAIResponse,
  type InterviewAssessment,
} from "@/lib/ai/schemas";

const FEATURE_NAME = "loan-interview";

// Cost estimate: ~2000 tokens per conversation turn
const COST_PER_INPUT_TOKEN = 0.000003;
const COST_PER_OUTPUT_TOKEN = 0.000015;

// Required topics that must be covered before interview is considered complete
const REQUIRED_TOPICS = [
  "business_plan",
  "loan_terms_understanding",
  "household_finances",
  "purpose_feasibility",
  "cooperative_obligations",
] as const;

type InterviewTopic = (typeof REQUIRED_TOPICS)[number];

// Keywords/phrases that indicate a topic has been discussed
const TOPIC_INDICATORS: Record<InterviewTopic, string[]> = {
  business_plan: [
    "business", "livelihood", "plan", "income source", "sell", "buy",
    "product", "service", "customer", "market", "negosyo", "hanapbuhay",
  ],
  loan_terms_understanding: [
    "interest", "rate", "repayment", "monthly payment", "amortization",
    "term", "maturity", "penalty", "due date", "bayad", "hulog",
  ],
  household_finances: [
    "household", "expense", "family", "dependent", "budget", "income",
    "salary", "gastos", "pamilya", "anak", "asawa", "rent", "utilities",
  ],
  purpose_feasibility: [
    "plan", "how will you use", "feasible", "realistic", "expect",
    "profit", "return", "payback", "succeed", "risk",
  ],
  cooperative_obligations: [
    "cbu", "share capital", "general assembly", "attendance", "guarantor",
    "training", "seminar", "cooperative", "obligation", "pmes",
  ],
};

function buildInterviewSystemPrompt(
  member: {
    firstName: string;
    lastName: string;
    membershipDate: Date;
    employmentType: string;
  },
  loan: {
    principalAmount: number;
    purpose: string;
  }
): string {
  const tenureMonths = Math.floor(
    (Date.now() - member.membershipDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  return `You are a friendly and professional loan counselor at Oro Integrated Cooperative in the Philippines. You are conducting a structured loan interview with a cooperative member who is applying for a micro-loan.

Your goals:
1. Understand their business/livelihood plan in detail
2. Assess their understanding of loan terms (interest, repayment schedule)
3. Understand their household financial situation (income sources, expenses, dependents)
4. Evaluate the feasibility of their loan purpose
5. Check their awareness of cooperative obligations (CBU, GA attendance, guarantors)

Rules:
- Be warm, respectful, and encouraging — this is a cooperative, not a bank
- Use simple language; many applicants may not be financially sophisticated
- Ask one question at a time
- Do not make approval/denial decisions — you are gathering information only
- If the applicant seems confused about loan terms, gently explain them
- Cover ALL 5 required topics before concluding
- When all topics are covered, thank them and let them know the credit committee will review their application
- Keep responses concise (2-4 sentences max per turn)

Member Context:
- Name: ${member.firstName} ${member.lastName}
- Membership: ${tenureMonths} months
- Employment: ${member.employmentType}
- Requested Amount: PHP ${Number(loan.principalAmount).toLocaleString("en-PH")}
- Stated Purpose: "${loan.purpose}"`;
}

function buildAssessmentPrompt(
  transcript: Array<{ role: string; content: string; timestamp: string }>
): string {
  return `Analyze the following loan interview transcript and generate a structured credit assessment. The interview was conducted with a micro-loan applicant at a Philippine cooperative.

Transcript:
${JSON.stringify(transcript, null, 2)}

Evaluate:
1. Financial literacy (0-100): Does the applicant understand interest rates, repayment schedules, and loan obligations?
2. Business viability (0-100): Is their business plan or livelihood goal realistic and specific?
3. Coherence (0-100): Were their answers consistent, specific, and credible?
4. Risk flags: Any red flags from the conversation?
5. Overall assessment score (0-100)

Return ONLY a JSON object with:
- overall_score (number 0-100)
- financial_literacy_score (number 0-100)
- business_viability_score (number 0-100)
- coherence_score (number 0-100)
- risk_flags (string[] - list of any concerns)
- summary (string - concise assessment summary)
- recommendation (string - brief recommendation for the credit committee)

Do NOT include any text outside the JSON object.`;
}

/**
 * Detects which interview topics have been covered based on the conversation transcript.
 */
function detectTopicsCovered(
  transcript: Array<{ role: string; content: string }>
): string[] {
  const allText = transcript
    .map((msg) => msg.content.toLowerCase())
    .join(" ");

  const coveredTopics: string[] = [];

  for (const topic of REQUIRED_TOPICS) {
    const indicators = TOPIC_INDICATORS[topic];
    const matchCount = indicators.filter((keyword) =>
      allText.includes(keyword.toLowerCase())
    ).length;
    // Consider a topic covered if at least 2 indicators are found
    if (matchCount >= 2) {
      coveredTopics.push(topic);
    }
  }

  return coveredTopics;
}

/**
 * Starts a new loan interview session.
 * Creates a LoanInterview record and returns the first AI greeting message.
 */
export async function startInterview(
  loanId: string,
  conductedById: string
): Promise<{ interviewId: string; firstMessage: string }> {
  // Query loan with member data
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { member: true },
  });

  if (!loan) {
    throw new Error(`Loan not found: ${loanId}`);
  }

  const systemPrompt = buildInterviewSystemPrompt(loan.member, {
    principalAmount: Number(loan.principalAmount),
    purpose: loan.purpose,
  });

  // Generate first AI message (greeting)
  const aiResponse = await callAI({
    systemPrompt,
    userPrompt:
      "The member has just sat down for their loan interview. Please greet them warmly and begin with your first question.",
    temperature: 0.5,
  });

  const firstMessage = aiResponse.content;
  const now = new Date();

  // Create interview record with initial transcript
  const interview = await prisma.loanInterview.create({
    data: {
      loanId,
      memberId: loan.memberId,
      conductedById,
      transcript: [
        {
          role: "assistant",
          content: firstMessage,
          timestamp: now.toISOString(),
        },
      ],
      topicsCovered: [],
      status: "IN_PROGRESS",
    },
  });

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

  return {
    interviewId: interview.id,
    firstMessage,
  };
}

/**
 * Continues an in-progress interview with a new user message.
 * Returns the AI response and updated topic coverage.
 */
export async function continueInterview(
  interviewId: string,
  userMessage: string
): Promise<{
  aiMessage: string;
  isComplete: boolean;
  topicsCovered: string[];
}> {
  try {
    // Fetch the interview with loan and member data
    const interview = await prisma.loanInterview.findUnique({
      where: { id: interviewId },
      include: {
        loan: true,
        member: true,
      },
    });

    if (!interview) {
      throw new Error(`Interview not found: ${interviewId}`);
    }

    if (interview.status !== "IN_PROGRESS") {
      throw new Error(`Interview is not in progress: ${interview.status}`);
    }

    const transcript = interview.transcript as Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;

    // Add user message to transcript
    const now = new Date();
    transcript.push({
      role: "user",
      content: userMessage,
      timestamp: now.toISOString(),
    });

    // Detect topics covered so far
    const topicsCovered = detectTopicsCovered(transcript);
    const allTopicsCovered = REQUIRED_TOPICS.every((t) =>
      topicsCovered.includes(t)
    );

    // Build conversation messages for the AI
    const systemPrompt = buildInterviewSystemPrompt(interview.member, {
      principalAmount: Number(interview.loan.principalAmount),
      purpose: interview.loan.purpose,
    });

    // Add topic coverage context to the user prompt
    let contextualPrompt = userMessage;
    if (allTopicsCovered) {
      contextualPrompt += "\n\n[System note: All required topics have been covered. You may wrap up the interview naturally.]";
    } else {
      const remaining = REQUIRED_TOPICS.filter(
        (t) => !topicsCovered.includes(t)
      );
      contextualPrompt += `\n\n[System note: Topics still to cover: ${remaining.join(", ")}. Guide the conversation to address these.]`;
    }

    // Build the full conversation for context
    const conversationContext = transcript
      .map((msg) => `${msg.role === "assistant" ? "Counselor" : "Member"}: ${msg.content}`)
      .join("\n\n");

    const aiResponse = await callAI({
      systemPrompt,
      userPrompt: `Previous conversation:\n${conversationContext}\n\n${contextualPrompt}`,
      temperature: 0.5,
    });

    const aiMessage = aiResponse.content;

    // Add AI response to transcript
    transcript.push({
      role: "assistant",
      content: aiMessage,
      timestamp: new Date().toISOString(),
    });

    // Check if interview should be marked as complete
    // The interview is complete if all topics are covered AND the AI has wrapped up
    const isComplete = allTopicsCovered && transcript.length >= 10; // minimum ~5 exchanges

    // Update interview record
    await prisma.loanInterview.update({
      where: { id: interviewId },
      data: {
        transcript: transcript as object[],
        topicsCovered,
        ...(isComplete
          ? { status: "COMPLETED", completedAt: new Date() }
          : {}),
      },
    });

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

    return {
      aiMessage,
      isComplete,
      topicsCovered,
    };
  } catch (error) {
    console.error(
      `[${FEATURE_NAME}] Error continuing interview ${interviewId}:`,
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

    // Return a graceful fallback message
    return {
      aiMessage:
        "I apologize, but I'm having a temporary technical issue. Let's continue in a moment. Could you please repeat what you just said?",
      isComplete: false,
      topicsCovered: [],
    };
  }
}

/**
 * Generates a structured assessment from the completed interview transcript.
 * Returns null on AI failure (graceful degradation).
 */
export async function assessInterview(
  interviewId: string
): Promise<InterviewAssessment | null> {
  try {
    const interview = await prisma.loanInterview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      console.error(`[${FEATURE_NAME}] Interview not found: ${interviewId}`);
      return null;
    }

    const transcript = interview.transcript as Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;

    if (transcript.length < 4) {
      console.error(
        `[${FEATURE_NAME}] Interview transcript too short for assessment: ${interviewId}`
      );
      return null;
    }

    const systemPrompt = `You are a senior credit analyst at a Philippine cooperative. You are reviewing a loan interview transcript to generate a structured assessment.`;
    const userPrompt = buildAssessmentPrompt(transcript);

    // Call AI for assessment
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
    });

    // Parse and validate
    const assessment = parseAIResponse(
      aiResponse.content,
      InterviewAssessmentSchema
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

    // Save assessment to interview record
    await prisma.loanInterview.update({
      where: { id: interviewId },
      data: {
        assessment: assessment as object,
        status: "COMPLETED",
        completedAt: interview.completedAt || new Date(),
      },
    });

    return assessment;
  } catch (error) {
    console.error(
      `[${FEATURE_NAME}] Error assessing interview ${interviewId}:`,
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
