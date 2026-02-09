import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { styles, colors, getRiskHexColor } from "./styles";
import {
  formatCurrency,
  formatDate,
  formatEnumLabel,
  getRiskLabel,
} from "@/lib/format";

interface NarrativeAssessment {
  score: number;
  risk_level: string;
  flags: string[];
  reasoning: string;
  purpose_category: string;
  alignment_with_profile: string;
}

interface DimensionScore {
  dimension: string;
  score: number;
  weight: number;
  weightedScore: number;
}

interface CreditMemo {
  narrative: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  suggested_max_amount: number;
  conditions: string[];
  improvement_tips: string[];
}

interface PaymentData {
  dueDate: Date;
  amountDue: string;
  amountPaid: string;
  principal: string;
  interest: string;
  penalty: string;
  status: string;
}

interface GuarantorData {
  name: string;
  membershipNumber: string;
  guaranteedAmount: string;
  status: string;
}

interface InterviewAssessment {
  overall_score: number;
  financial_literacy_score: number;
  business_viability_score: number;
  coherence_score: number;
  risk_flags: string[];
  summary: string;
  recommendation: string;
}

interface InterviewData {
  startedAt: Date;
  status: string;
  conductedByName: string;
  topicsCovered: string[];
  assessment: InterviewAssessment | null;
}

export interface LoanReportData {
  loan: {
    id: string;
    loanType: string;
    principalAmount: string;
    interestRate: string;
    termMonths: number;
    purpose: string;
    status: string;
    applicationDate: Date;
    approvalDate: Date | null;
    releaseDate: Date | null;
    maturityDate: Date;
  };
  applicant: {
    firstName: string;
    lastName: string;
    membershipNumber: string;
    employmentType: string;
    employerOrBusiness: string | null;
    monthlyIncome: string;
    membershipDate: Date;
  };
  narrativeAssessment: NarrativeAssessment | null;
  creditScore: {
    totalScore: number;
    riskCategory: string;
    scoringPathway: string;
    dimensionScores: DimensionScore[];
    recommendations: CreditMemo | null;
  } | null;
  payments: PaymentData[];
  guarantors: GuarantorData[];
  interview: InterviewData | null;
}

export function LoanReport({ data }: { data: LoanReportData }) {
  const { loan, applicant, narrativeAssessment, creditScore, payments, guarantors, interview } = data;
  const generatedAt = formatDate(new Date());
  const applicantName = `${applicant.firstName} ${applicant.lastName}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerOrg}>Oro Integrated Cooperative</Text>
          <Text style={styles.headerTitle}>Loan Assessment Report</Text>
          <Text style={styles.headerSubtitle}>
            {formatEnumLabel(loan.loanType)} Loan — {applicantName} ({applicant.membershipNumber})
          </Text>
          <Text style={styles.headerDate}>Generated: {generatedAt}</Text>
        </View>

        {/* Loan Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Loan Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Loan ID</Text>
              <Text style={styles.infoValue}>{loan.id.slice(0, 8)}...</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{formatEnumLabel(loan.loanType)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Principal Amount</Text>
              <Text style={styles.infoValue}>{formatCurrency(loan.principalAmount)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Interest Rate</Text>
              <Text style={styles.infoValue}>
                {(Number(loan.interestRate) * 100).toFixed(2)}%
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Term</Text>
              <Text style={styles.infoValue}>{loan.termMonths} months</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{formatEnumLabel(loan.status)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Purpose</Text>
              <Text style={styles.infoValue}>{loan.purpose}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Application Date</Text>
              <Text style={styles.infoValue}>{formatDate(loan.applicationDate)}</Text>
            </View>
            {loan.approvalDate && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Approval Date</Text>
                <Text style={styles.infoValue}>{formatDate(loan.approvalDate)}</Text>
              </View>
            )}
            {loan.releaseDate && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Release Date</Text>
                <Text style={styles.infoValue}>{formatDate(loan.releaseDate)}</Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Maturity Date</Text>
              <Text style={styles.infoValue}>{formatDate(loan.maturityDate)}</Text>
            </View>
          </View>
        </View>

        {/* Applicant Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Applicant Summary</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{applicantName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Membership #</Text>
              <Text style={styles.infoValue}>{applicant.membershipNumber}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Employment</Text>
              <Text style={styles.infoValue}>
                {formatEnumLabel(applicant.employmentType)}
                {applicant.employerOrBusiness ? ` — ${applicant.employerOrBusiness}` : ""}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Monthly Income</Text>
              <Text style={styles.infoValue}>{formatCurrency(applicant.monthlyIncome)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{formatDate(applicant.membershipDate)}</Text>
            </View>
          </View>
        </View>

        {/* Credit Score */}
        {creditScore && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credit Score</Text>
            <View style={styles.scoreContainer}>
              <View>
                <Text
                  style={[
                    styles.scoreNumber,
                    { color: getRiskHexColor(creditScore.riskCategory) },
                  ]}
                >
                  {creditScore.totalScore}
                </Text>
                <Text style={styles.scoreLabel}>out of 850</Text>
              </View>
              <View>
                <Text
                  style={[
                    styles.infoValue,
                    { fontSize: 12, color: getRiskHexColor(creditScore.riskCategory) },
                  ]}
                >
                  {getRiskLabel(creditScore.riskCategory)}
                </Text>
                <Text style={[styles.scoreLabel, { marginTop: 2 }]}>
                  {creditScore.scoringPathway === "THIN_FILE" ? "Thin File" : "Standard"} pathway
                </Text>
              </View>
            </View>

            {/* Dimension Scores */}
            {creditScore.dimensionScores.length > 0 && (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: "50%" }]}>Dimension</Text>
                  <Text style={[styles.tableHeaderCell, { width: "17%", textAlign: "center" }]}>Score</Text>
                  <Text style={[styles.tableHeaderCell, { width: "17%", textAlign: "center" }]}>Weight</Text>
                  <Text style={[styles.tableHeaderCell, { width: "16%", textAlign: "center" }]}>Weighted</Text>
                </View>
                {creditScore.dimensionScores.map((dim, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: "50%" }]}>{dim.dimension}</Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.bold,
                        { width: "17%", textAlign: "center" },
                        {
                          color: dim.score >= 70 ? colors.green : dim.score >= 40 ? colors.amber : colors.red,
                        },
                      ]}
                    >
                      {dim.score}
                    </Text>
                    <Text style={[styles.tableCell, { width: "17%", textAlign: "center", color: colors.muted }]}>
                      {dim.weight}%
                    </Text>
                    <Text style={[styles.tableCell, styles.bold, { width: "16%", textAlign: "center" }]}>
                      {dim.weightedScore.toFixed(1)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* AI Credit Memo */}
        {creditScore?.recommendations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Credit Memo</Text>
            <View
              style={[
                styles.recommendationBanner,
                {
                  backgroundColor:
                    creditScore.recommendations.recommendation === "approve"
                      ? "#dcfce7"
                      : creditScore.recommendations.recommendation === "decline"
                      ? "#fef2f2"
                      : "#fef9c3",
                },
              ]}
            >
              <Text
                style={[
                  styles.bold,
                  {
                    fontSize: 11,
                    color:
                      creditScore.recommendations.recommendation === "approve"
                        ? colors.green
                        : creditScore.recommendations.recommendation === "decline"
                        ? colors.red
                        : colors.amber,
                  },
                ]}
              >
                {creditScore.recommendations.recommendation.toUpperCase()}
              </Text>
              {creditScore.recommendations.suggested_max_amount > 0 && (
                <Text style={{ fontSize: 9, color: colors.muted }}>
                  {" "}— Max: {formatCurrency(creditScore.recommendations.suggested_max_amount)}
                </Text>
              )}
            </View>
            <Text style={styles.paragraph}>{creditScore.recommendations.narrative}</Text>
            {creditScore.recommendations.conditions.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={[styles.bold, { fontSize: 9, marginBottom: 3 }]}>Conditions:</Text>
                {creditScore.recommendations.conditions.map((c, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </Page>

      {/* Page 2: Narrative Analysis, Payments, Guarantors, Interview */}
      <Page size="A4" style={styles.page}>
        {/* AI Narrative Analysis */}
        {narrativeAssessment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Narrative Analysis</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItemThird}>
                <Text style={styles.infoLabel}>Narrative Score</Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color:
                        narrativeAssessment.score >= 70
                          ? colors.green
                          : narrativeAssessment.score >= 40
                          ? colors.amber
                          : colors.red,
                    },
                  ]}
                >
                  {narrativeAssessment.score}/100
                </Text>
              </View>
              <View style={styles.infoItemThird}>
                <Text style={styles.infoLabel}>Risk Level</Text>
                <Text style={styles.infoValue}>{narrativeAssessment.risk_level.toUpperCase()}</Text>
              </View>
              <View style={styles.infoItemThird}>
                <Text style={styles.infoLabel}>Profile Alignment</Text>
                <Text style={styles.infoValue}>
                  {formatEnumLabel(narrativeAssessment.alignment_with_profile)}
                </Text>
              </View>
            </View>
            <Text style={[styles.paragraph, { marginTop: 6 }]}>
              {narrativeAssessment.reasoning}
            </Text>
            {narrativeAssessment.flags.length > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={[styles.bold, { fontSize: 9, marginBottom: 3 }]}>Flags:</Text>
                {narrativeAssessment.flags.map((f, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={[styles.bullet, { color: colors.red }]}>!</Text>
                    <Text style={styles.bulletText}>{f}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Payment Schedule */}
        {payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Payment Schedule ({payments.length} payment{payments.length > 1 ? "s" : ""})
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: "6%" }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Due Date</Text>
                <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Due</Text>
                <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Paid</Text>
                <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Principal</Text>
                <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Interest</Text>
                <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Status</Text>
              </View>
              {payments.map((p, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: "6%", color: colors.muted }]}>
                    {i + 1}
                  </Text>
                  <Text style={[styles.tableCell, { width: "18%", fontSize: 8 }]}>
                    {formatDate(p.dueDate)}
                  </Text>
                  <Text style={[styles.tableCell, styles.bold, { width: "16%", fontSize: 8 }]}>
                    {formatCurrency(p.amountDue)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "16%", fontSize: 8 }]}>
                    {formatCurrency(p.amountPaid)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "14%", fontSize: 8, color: colors.muted }]}>
                    {formatCurrency(p.principal)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "14%", fontSize: 8, color: colors.muted }]}>
                    {formatCurrency(p.interest)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.bold,
                      { width: "16%", fontSize: 8 },
                      {
                        color:
                          p.status === "ON_TIME"
                            ? colors.green
                            : p.status === "LATE"
                            ? colors.amber
                            : p.status === "MISSED"
                            ? colors.red
                            : colors.muted,
                      },
                    ]}
                  >
                    {p.status === "ON_TIME" ? "On Time" : formatEnumLabel(p.status)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Guarantors */}
        {guarantors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guarantors</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Name</Text>
                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Membership #</Text>
                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Amount</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Status</Text>
              </View>
              {guarantors.map((g, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.bold, { width: "30%" }]}>{g.name}</Text>
                  <Text style={[styles.tableCell, { width: "25%", color: colors.muted }]}>
                    {g.membershipNumber}
                  </Text>
                  <Text style={[styles.tableCell, styles.bold, { width: "25%" }]}>
                    {formatCurrency(g.guaranteedAmount)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      {
                        width: "20%",
                        color: g.status === "ACTIVE" ? colors.green : g.status === "CALLED" ? colors.red : colors.muted,
                      },
                    ]}
                  >
                    {formatEnumLabel(g.status)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Interview Assessment */}
        {interview && interview.assessment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Loan Interview Assessment</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Conducted By</Text>
                <Text style={styles.infoValue}>{interview.conductedByName}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(interview.startedAt)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Overall Score</Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color:
                        interview.assessment.overall_score >= 70
                          ? colors.green
                          : interview.assessment.overall_score >= 40
                          ? colors.amber
                          : colors.red,
                    },
                  ]}
                >
                  {interview.assessment.overall_score}/100
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Financial Literacy</Text>
                <Text style={styles.infoValue}>{interview.assessment.financial_literacy_score}/100</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Business Viability</Text>
                <Text style={styles.infoValue}>{interview.assessment.business_viability_score}/100</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Coherence</Text>
                <Text style={styles.infoValue}>{interview.assessment.coherence_score}/100</Text>
              </View>
            </View>
            <Text style={[styles.paragraph, { marginTop: 6 }]}>
              {interview.assessment.summary}
            </Text>
            {interview.assessment.risk_flags.length > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={[styles.bold, { fontSize: 9, marginBottom: 3 }]}>Risk Flags:</Text>
                {interview.assessment.risk_flags.map((f, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={[styles.bullet, { color: colors.red }]}>!</Text>
                    <Text style={styles.bulletText}>{f}</Text>
                  </View>
                ))}
              </View>
            )}
            {interview.topicsCovered.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.bold, { fontSize: 9, marginBottom: 3 }]}>Topics Covered:</Text>
                <Text style={[styles.paragraph, { fontSize: 8 }]}>
                  {interview.topicsCovered.join(", ")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Confidential — Oro Integrated Cooperative
          </Text>
          <Text style={styles.footerText}>
            Generated by CoopScore Credit Intelligence
          </Text>
        </View>
      </Page>
    </Document>
  );
}
