import { prisma } from "@/lib/db";
import { callAI } from "@/lib/ai/client";
import {
  AnomalyAlertResultSchema,
  parseAIResponse,
  type AnomalyAlertResult,
} from "@/lib/ai/schemas";

const FEATURE_NAME = "anomaly-detection";

// Cost estimate: ~1500 input tokens + ~400 output tokens per member
const COST_PER_INPUT_TOKEN = 0.000003;
const COST_PER_OUTPUT_TOKEN = 0.000015;

// Map snake_case alertType from AI response to Prisma enum
const ALERT_TYPE_MAP: Record<string, "WITHDRAWAL_SPIKE" | "ATTENDANCE_DROP" | "HOUSEHOLD_CLUSTER" | "GUARANTOR_CONCENTRATION" | "MANUFACTURED_PATTERN" | "RAPID_LOAN_CYCLING" | "OTHER"> = {
  withdrawal_spike: "WITHDRAWAL_SPIKE",
  attendance_drop: "ATTENDANCE_DROP",
  household_cluster: "HOUSEHOLD_CLUSTER",
  guarantor_concentration: "GUARANTOR_CONCENTRATION",
  manufactured_pattern: "MANUFACTURED_PATTERN",
  rapid_loan_cycling: "RAPID_LOAN_CYCLING",
  other: "OTHER",
};

const SEVERITY_MAP: Record<string, "LOW" | "MEDIUM" | "HIGH"> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

function buildSystemPrompt(): string {
  return `You are a risk monitoring analyst for a Philippine cooperative. Review the following member activity summary for the past 90 days and identify any anomalous patterns that may indicate credit risk.

Check specifically for:
1. WITHDRAWAL SPIKE: Unusual CBU or savings withdrawals, especially before loan applications
2. ATTENDANCE DROP: Member who previously attended GAs/trainings regularly but has stopped
3. HOUSEHOLD CLUSTER: Note if address matches other recent loan applicants (information provided if relevant)
4. GUARANTOR CONCENTRATION: Member is guaranteeing an unusually high number of loans
5. MANUFACTURED PATTERN: Savings deposits that appear artificially consistent (exact same amount, exact same date each month — may not reflect real income patterns)
6. RAPID CYCLING: Borrowing immediately after repaying, with increasing amounts

For each anomaly found, return a JSON array of objects with:
- alertType ("withdrawal_spike" | "attendance_drop" | "household_cluster" | "guarantor_concentration" | "manufactured_pattern" | "rapid_loan_cycling" | "other")
- severity ("low" | "medium" | "high")
- description (string - clear explanation of the anomaly)
- evidence (object - the specific data points that triggered the alert)

If no anomalies are found, return an empty JSON array: []

Return ONLY the JSON array. Do NOT include any text outside the JSON.`;
}

async function buildActivitySummary(memberId: string) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Query all recent activity in parallel
  const [
    member,
    shareCapitalTxns,
    savingsTxns,
    loans,
    guarantorActivity,
    attendanceRecords,
    recentPayments,
  ] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      select: {
        firstName: true,
        lastName: true,
        membershipNumber: true,
        membershipDate: true,
        employmentType: true,
        monthlyIncome: true,
        barangay: true,
        city: true,
      },
    }),
    prisma.shareCapital.findMany({
      where: {
        memberId,
        transactionDate: { gte: ninetyDaysAgo },
      },
      orderBy: { transactionDate: "desc" },
    }),
    prisma.savingsTransaction.findMany({
      where: {
        memberId,
        transactionDate: { gte: ninetyDaysAgo },
      },
      orderBy: { transactionDate: "desc" },
    }),
    prisma.loan.findMany({
      where: {
        memberId,
        OR: [
          { applicationDate: { gte: ninetyDaysAgo } },
          { status: { in: ["CURRENT", "DELINQUENT", "PENDING", "APPROVED"] } },
        ],
      },
      include: {
        payments: {
          where: { dueDate: { gte: ninetyDaysAgo } },
          orderBy: { dueDate: "desc" },
        },
      },
    }),
    prisma.guarantor.findMany({
      where: {
        guarantorMemberId: memberId,
        status: "ACTIVE",
      },
      include: {
        loan: {
          select: {
            status: true,
            principalAmount: true,
            memberId: true,
          },
        },
      },
    }),
    prisma.activityAttendance.findMany({
      where: {
        memberId,
        activity: {
          date: { gte: ninetyDaysAgo },
        },
      },
      include: {
        activity: {
          select: {
            title: true,
            date: true,
            activityType: true,
          },
        },
      },
    }),
    prisma.loanPayment.findMany({
      where: {
        loan: { memberId },
        dueDate: { gte: ninetyDaysAgo },
      },
      orderBy: { dueDate: "desc" },
    }),
  ]);

  if (!member) return null;

  return {
    member: {
      name: `${member.firstName} ${member.lastName}`,
      membershipNumber: member.membershipNumber,
      memberSince: member.membershipDate.toISOString().split("T")[0],
      employment: member.employmentType,
      monthlyIncome: Number(member.monthlyIncome),
      location: `${member.barangay}, ${member.city}`,
    },
    shareCapitalTransactions: shareCapitalTxns.map((t) => ({
      date: t.transactionDate.toISOString().split("T")[0],
      type: t.transactionType,
      amount: Number(t.amount),
      runningBalance: Number(t.runningBalance),
    })),
    savingsTransactions: savingsTxns.map((t) => ({
      date: t.transactionDate.toISOString().split("T")[0],
      type: t.transactionType,
      accountType: t.accountType,
      amount: Number(t.amount),
      runningBalance: Number(t.runningBalance),
    })),
    loans: loans.map((l) => ({
      type: l.loanType,
      amount: Number(l.principalAmount),
      status: l.status,
      applicationDate: l.applicationDate.toISOString().split("T")[0],
      purpose: l.purpose,
      payments: l.payments.map((p) => ({
        dueDate: p.dueDate.toISOString().split("T")[0],
        paymentDate: p.paymentDate?.toISOString().split("T")[0] || null,
        amountDue: Number(p.amountDue),
        amountPaid: Number(p.amountPaid),
        status: p.status,
      })),
    })),
    guarantorActivity: {
      activeGuarantees: guarantorActivity.length,
      totalExposure: guarantorActivity.reduce(
        (sum, g) => sum + Number(g.guaranteedAmount),
        0
      ),
      guaranteedLoans: guarantorActivity.map((g) => ({
        loanStatus: g.loan.status,
        amount: Number(g.guaranteedAmount),
      })),
    },
    activityAttendance: attendanceRecords.map((a) => ({
      title: a.activity.title,
      date: a.activity.date.toISOString().split("T")[0],
      type: a.activity.activityType,
      attended: a.attended,
    })),
    recentPaymentSummary: {
      total: recentPayments.length,
      onTime: recentPayments.filter((p) => p.status === "ON_TIME").length,
      late: recentPayments.filter((p) => p.status === "LATE").length,
      missed: recentPayments.filter((p) => p.status === "MISSED").length,
      partial: recentPayments.filter((p) => p.status === "PARTIAL").length,
    },
  };
}

/**
 * Detects anomalous behavioral patterns for a single member.
 * Returns an empty array on AI failure (graceful degradation).
 */
export async function detectAnomalies(
  memberId: string
): Promise<AnomalyAlertResult> {
  try {
    const activitySummary = await buildActivitySummary(memberId);

    if (!activitySummary) {
      console.error(`[${FEATURE_NAME}] Member not found: ${memberId}`);
      return [];
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = `Member Activity Summary (Last 90 Days):\n${JSON.stringify(activitySummary, null, 2)}`;

    // Call AI
    const aiResponse = await callAI({
      systemPrompt,
      userPrompt,
      maxTokens: 1024,
      temperature: 0.2,
    });

    // Parse and validate
    const alerts = parseAIResponse(
      aiResponse.content,
      AnomalyAlertResultSchema
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

    // Save alerts to AnomalyAlert table
    if (alerts.length > 0) {
      await prisma.anomalyAlert.createMany({
        data: alerts.map((alert) => ({
          memberId,
          alertType: ALERT_TYPE_MAP[alert.alertType] || "OTHER",
          severity: SEVERITY_MAP[alert.severity] || "LOW",
          description: alert.description,
          evidence: alert.evidence as object,
        })),
      });
    }

    return alerts;
  } catch (error) {
    console.error(
      `[${FEATURE_NAME}] Error detecting anomalies for member ${memberId}:`,
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
    return [];
  }
}

/**
 * Batch anomaly detection for all active members.
 * Processes members sequentially to respect rate limits.
 */
export async function batchDetectAnomalies(): Promise<{
  processed: number;
  alertsCreated: number;
}> {
  let processed = 0;
  let alertsCreated = 0;

  try {
    // Get all active members
    const activeMembers = await prisma.member.findMany({
      where: { membershipStatus: "ACTIVE" },
      select: { id: true },
    });

    for (const member of activeMembers) {
      try {
        const alerts = await detectAnomalies(member.id);
        processed++;
        alertsCreated += alerts.length;
      } catch (error) {
        // Log individual member failure but continue batch
        console.error(
          `[${FEATURE_NAME}] Batch: Failed for member ${member.id}:`,
          error
        );
        processed++;
      }
    }
  } catch (error) {
    console.error(`[${FEATURE_NAME}] Batch detection failed:`, error);
  }

  return { processed, alertsCreated };
}
