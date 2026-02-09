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

// Supported interview languages
export type InterviewLanguage = "english" | "bisaya" | "filipino";

// Required topics that must be covered before interview is considered complete
const REQUIRED_TOPICS = [
  "business_plan",
  "loan_terms_understanding",
  "household_finances",
  "purpose_feasibility",
  "cooperative_obligations",
] as const;

type InterviewTopic = (typeof REQUIRED_TOPICS)[number];

// Minimum number of transcript messages that specifically mention a topic
// before it's considered "deeply covered" (not just surface-level keyword hit)
const MIN_TOPIC_DEPTH = 3;

// Minimum total transcript messages before interview can complete (~8 exchanges)
const MIN_TRANSCRIPT_LENGTH = 16;

// Keywords/phrases that indicate a topic has been discussed
// Includes English, Filipino, and Bisaya indicators
const TOPIC_INDICATORS: Record<InterviewTopic, string[]> = {
  business_plan: [
    // English
    "business", "livelihood", "plan", "income source", "sell", "buy",
    "product", "service", "customer", "market", "revenue", "sales",
    "supplier", "inventory", "profit margin", "operate", "grow",
    // Filipino
    "negosyo", "hanapbuhay", "paninda", "kita", "benta",
    // Bisaya
    "negosyante", "panginabuhian", "baligya", "palit", "suki",
    "tindahan", "merkado", "ganansya", "puhunan", "kargamento",
  ],
  loan_terms_understanding: [
    // English
    "interest", "rate", "repayment", "monthly payment", "amortization",
    "term", "maturity", "penalty", "due date", "balance", "principal",
    "schedule", "installment", "overdue",
    // Filipino
    "bayad", "hulog", "tubo", "interes", "multa", "takdang araw",
    // Bisaya
    "bayad", "hulog", "tubo", "interes", "multa", "utang",
    "bulanan", "bayrunon", "plete", "singil", "pautang",
  ],
  household_finances: [
    // English
    "household", "expense", "family", "dependent", "budget", "income",
    "salary", "rent", "utilities", "food", "education", "medical",
    "savings", "other income", "spouse", "children",
    // Filipino
    "gastos", "pamilya", "anak", "asawa", "sahod", "upa", "kuryente",
    "tubig", "pagkain", "paaralan",
    // Bisaya
    "gasto", "pamilya", "anak", "asawa", "sweldo", "abang",
    "kuryente", "tubig", "pagkaon", "eskwela", "tambal", "panimalay",
    "kinahanglan", "inadlaw", "tinipigan",
  ],
  purpose_feasibility: [
    // English
    "plan", "how will you use", "feasible", "realistic", "expect",
    "profit", "return", "payback", "succeed", "risk", "timeline",
    "when", "how long", "goal", "result", "outcome",
    // Filipino
    "plano", "gagamitin", "inaasahan", "kita", "balik",
    // Bisaya
    "plano", "gamiton", "magamit", "ganansya", "balik",
    "tuyo", "padulngan", "target", "resulta", "panahon",
  ],
  cooperative_obligations: [
    // English
    "cbu", "share capital", "general assembly", "attendance", "guarantor",
    "training", "seminar", "cooperative", "obligation", "pmes",
    "member duties", "co-maker", "proxy",
    // Filipino
    "kapital", "pulong", "pagsasanay", "tungkulin", "kooperatiba",
    // Bisaya
    "kapital", "miting", "tigum", "obligasyon", "kooperatiba",
    "tulunganay", "guarantor", "training", "pulong",
    "kauban", "miyembro", "katungdanan",
  ],
};

const LANGUAGE_INSTRUCTIONS: Record<InterviewLanguage, string> = {
  english: `Conduct this interview in English. Use simple, clear English appropriate for applicants who may not be financially sophisticated.`,
  bisaya: `Conduct this interview primarily in Bisaya (Cebuano). The applicant is most comfortable speaking Bisaya.
Use natural conversational Bisaya as spoken in Cagayan de Oro.
You may use common English terms for financial concepts (e.g., "interest", "loan", "business") when there's no common Bisaya equivalent, as this reflects natural Bisaya-English code-switching in CDO.
If the applicant responds in English, you may naturally switch to English but default back to Bisaya.
Example greetings: "Maayong buntag!", "Kumusta ka?", "Lingkod lang."`,
  filipino: `Conduct this interview primarily in Filipino (Tagalog). The applicant is most comfortable speaking Filipino.
You may use common English terms for financial concepts when natural (Taglish is fine).
If the applicant responds in another language, you may adapt.`,
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
  },
  language: InterviewLanguage = "english"
): string {
  const tenureMonths = Math.floor(
    (Date.now() - member.membershipDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  return `You are a friendly and professional loan counselor at Oro Integrated Cooperative in the Philippines. You are conducting a structured loan interview with a cooperative member who is applying for a micro-loan.

Language: ${LANGUAGE_INSTRUCTIONS[language]}

Your goals — you must cover ALL 5 of these topics thoroughly:
1. Business/livelihood plan: Understand their business or livelihood in DETAIL — what they do, how they earn, who their customers are, how they plan to grow
2. Loan terms understanding: Assess whether they understand interest rates, repayment schedules, penalties, and what happens if they miss payments
3. Household finances: Understand their full financial picture — income sources, monthly expenses, dependents, savings, other debts
4. Purpose feasibility: Evaluate whether their loan purpose is realistic and well-thought-out — ask follow-up questions to probe deeper
5. Cooperative obligations: Check their awareness of CBU contributions, GA attendance requirements, guarantor obligations, and PMES trainings

Rules:
- Be warm, respectful, and encouraging — this is a cooperative, not a bank
- Use simple language appropriate for the chosen interview language
- Ask ONE question at a time — do not bundle multiple questions
- Ask probing FOLLOW-UP questions — do not accept vague or surface-level answers. If someone says "I sell food", ask what kind of food, how much they sell per day, who their customers are, etc.
- Do not make approval/denial decisions — you are gathering information only
- If the applicant seems confused about loan terms, gently explain them
- Cover ALL 5 required topics thoroughly before concluding — spend at least 2-3 questions per topic
- The interview should feel like a natural conversation, not an interrogation
- When all topics are deeply covered, thank them and let them know the credit committee will review their application
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
  return `Analyze the following loan interview transcript and generate a structured credit assessment. The interview was conducted with a micro-loan applicant at a Philippine cooperative. The interview may be in English, Filipino, or Bisaya — evaluate the content regardless of language.

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
- risk_flags (string[] - list of any concerns, always in English)
- summary (string - concise assessment summary, always in English)
- recommendation (string - brief recommendation for the credit committee, always in English)

Do NOT include any text outside the JSON object.`;
}

/**
 * Detects which interview topics have been covered based on the conversation transcript.
 * A topic requires at least MIN_TOPIC_DEPTH keyword hits across multiple messages
 * to be considered "deeply covered".
 */
function detectTopicsCovered(
  transcript: Array<{ role: string; content: string }>
): string[] {
  const coveredTopics: string[] = [];

  for (const topic of REQUIRED_TOPICS) {
    const indicators = TOPIC_INDICATORS[topic];
    // Count how many distinct messages contain at least one indicator for this topic
    let messagesWithTopic = 0;
    for (const msg of transcript) {
      const text = msg.content.toLowerCase();
      const hasIndicator = indicators.some((keyword) =>
        text.includes(keyword.toLowerCase())
      );
      if (hasIndicator) {
        messagesWithTopic++;
      }
    }
    // Topic is covered if indicators appear in at least MIN_TOPIC_DEPTH messages
    if (messagesWithTopic >= MIN_TOPIC_DEPTH) {
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
  conductedById: string,
  language: InterviewLanguage = "english"
): Promise<{ interviewId: string; firstMessage: string }> {
  // Query loan with member data
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { member: true },
  });

  if (!loan) {
    throw new Error(`Loan not found: ${loanId}`);
  }

  const systemPrompt = buildInterviewSystemPrompt(
    loan.member,
    {
      principalAmount: Number(loan.principalAmount),
      purpose: loan.purpose,
    },
    language
  );

  const greetingInstruction = {
    english:
      "The member has just sat down for their loan interview. Please greet them warmly in English and begin with your first question.",
    bisaya:
      "The member has just sat down for their loan interview. Please greet them warmly in Bisaya (as spoken in Cagayan de Oro) and begin with your first question. Use natural conversational Bisaya.",
    filipino:
      "The member has just sat down for their loan interview. Please greet them warmly in Filipino and begin with your first question.",
  }[language];

  // Generate first AI message (greeting)
  const aiResponse = await callAI({
    systemPrompt,
    userPrompt: greetingInstruction,
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
          language,
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
      language?: string;
    }>;

    // Read the language from the first transcript entry (stored at interview start)
    const language = (transcript[0]?.language as InterviewLanguage) || "english";

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
    const systemPrompt = buildInterviewSystemPrompt(
      interview.member,
      {
        principalAmount: Number(interview.loan.principalAmount),
        purpose: interview.loan.purpose,
      },
      language
    );

    // Add topic coverage context to the user prompt
    let contextualPrompt = userMessage;
    if (allTopicsCovered && transcript.length >= MIN_TRANSCRIPT_LENGTH) {
      contextualPrompt += "\n\n[System note: All required topics have been thoroughly covered and the interview has sufficient depth. You may wrap up the interview naturally. Thank the applicant and let them know the credit committee will review.]";
    } else if (allTopicsCovered) {
      const remaining = MIN_TRANSCRIPT_LENGTH - transcript.length;
      contextualPrompt += `\n\n[System note: All topics have been touched but the interview needs more depth (${remaining} more exchanges needed). Ask follow-up questions to dig deeper into the topics already covered — probe for specifics, numbers, and concrete details.]`;
    } else {
      const remaining = REQUIRED_TOPICS.filter(
        (t) => !topicsCovered.includes(t)
      );
      contextualPrompt += `\n\n[System note: Topics still needing deeper coverage: ${remaining.join(", ")}. Guide the conversation to address these. Remember to ask follow-up questions, not just surface-level ones.]`;
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
    // The interview is complete if all topics are deeply covered AND minimum depth is reached
    const isComplete = allTopicsCovered && transcript.length >= MIN_TRANSCRIPT_LENGTH;

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

    const systemPrompt = `You are a senior credit analyst at a Philippine cooperative. You are reviewing a loan interview transcript to generate a structured assessment. The interview may have been conducted in English, Filipino, or Bisaya — analyze the content regardless of language. Always write your assessment in English.`;
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
