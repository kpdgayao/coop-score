import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { styles, colors, getRiskHexColor } from "./styles";
import {
  formatCurrency,
  formatDate,
  formatEnumLabel,
  getRiskLabel,
} from "@/lib/format";

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

interface CreditScoreData {
  totalScore: number;
  riskCategory: string;
  scoringPathway: string;
  scoreDate: Date;
  modelVersion: string;
  dimensionScores: DimensionScore[];
  recommendations: CreditMemo | null;
}

interface LoanData {
  id: string;
  loanType: string;
  principalAmount: string;
  status: string;
  applicationDate: Date;
  maturityDate: Date;
  termMonths: number;
}

interface CommitteeData {
  committeeName: string;
  role: string;
  isActive: boolean;
}

export interface MemberReportData {
  member: {
    membershipNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    dateOfBirth: Date;
    gender: string;
    civilStatus: string;
    barangay: string;
    city: string;
    province: string;
    contactNumber: string;
    email: string | null;
    employmentType: string;
    employerOrBusiness: string | null;
    monthlyIncome: string;
    membershipDate: Date;
    membershipStatus: string;
    pmesCompletionDate: Date | null;
  };
  creditScore: CreditScoreData | null;
  shareCapitalBalance: string | null;
  loans: LoanData[];
  engagement: {
    activitiesAttended: number;
    activitiesInvited: number;
    committees: CommitteeData[];
    referralsMade: number;
  };
}

export function MemberReport({ data }: { data: MemberReportData }) {
  const { member, creditScore, shareCapitalBalance, loans, engagement } = data;
  const fullName = `${member.firstName} ${member.middleName ?? ""} ${member.lastName}`.trim();
  const generatedAt = formatDate(new Date());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerOrg}>Oro Integrated Cooperative</Text>
          <Text style={styles.headerTitle}>Member Credit Profile Report</Text>
          <Text style={styles.headerSubtitle}>
            {fullName} — {member.membershipNumber}
          </Text>
          <Text style={styles.headerDate}>Generated: {generatedAt}</Text>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{fullName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Membership Number</Text>
              <Text style={styles.infoValue}>{member.membershipNumber}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date of Birth</Text>
              <Text style={styles.infoValue}>{formatDate(member.dateOfBirth)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Gender / Civil Status</Text>
              <Text style={styles.infoValue}>
                {formatEnumLabel(member.gender)} / {formatEnumLabel(member.civilStatus)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>
                {member.barangay}, {member.city}, {member.province}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Contact</Text>
              <Text style={styles.infoValue}>
                {member.contactNumber}
                {member.email ? ` | ${member.email}` : ""}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Employment</Text>
              <Text style={styles.infoValue}>
                {formatEnumLabel(member.employmentType)}
                {member.employerOrBusiness ? ` — ${member.employerOrBusiness}` : ""}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Monthly Income</Text>
              <Text style={styles.infoValue}>{formatCurrency(member.monthlyIncome)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{formatDate(member.membershipDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{formatEnumLabel(member.membershipStatus)}</Text>
            </View>
            {member.pmesCompletionDate && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>PMES Completion</Text>
                <Text style={styles.infoValue}>{formatDate(member.pmesCompletionDate)}</Text>
              </View>
            )}
            {shareCapitalBalance && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Share Capital Balance</Text>
                <Text style={styles.infoValue}>{formatCurrency(shareCapitalBalance)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Credit Score */}
        {creditScore && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credit Score Summary</Text>
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
              <View style={{ flex: 1 }}>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Risk Category</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        { color: getRiskHexColor(creditScore.riskCategory) },
                      ]}
                    >
                      {getRiskLabel(creditScore.riskCategory)}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Scoring Pathway</Text>
                    <Text style={styles.infoValue}>
                      {creditScore.scoringPathway === "THIN_FILE"
                        ? "Thin File"
                        : "Standard"}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Score Date</Text>
                    <Text style={styles.infoValue}>
                      {formatDate(creditScore.scoreDate)}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Model Version</Text>
                    <Text style={styles.infoValue}>v{creditScore.modelVersion}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Dimension Scores Table */}
            {creditScore.dimensionScores.length > 0 && (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: "45%" }]}>
                    Dimension
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: "18%", textAlign: "center" }]}>
                    Score
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: "18%", textAlign: "center" }]}>
                    Weight
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: "19%", textAlign: "center" }]}>
                    Weighted
                  </Text>
                </View>
                {creditScore.dimensionScores.map((dim, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: "45%" }]}>
                      {dim.dimension}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.bold,
                        { width: "18%", textAlign: "center" },
                        {
                          color:
                            dim.score >= 70
                              ? colors.green
                              : dim.score >= 40
                              ? colors.amber
                              : colors.red,
                        },
                      ]}
                    >
                      {dim.score}/100
                    </Text>
                    <Text style={[styles.tableCell, { width: "18%", textAlign: "center", color: colors.muted }]}>
                      {dim.weight}%
                    </Text>
                    <Text style={[styles.tableCell, styles.bold, { width: "19%", textAlign: "center" }]}>
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
            <Text style={styles.sectionTitle}>AI Credit Assessment</Text>
            {/* Recommendation Banner */}
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
                Recommendation: {creditScore.recommendations.recommendation.toUpperCase()}
              </Text>
              {creditScore.recommendations.suggested_max_amount > 0 && (
                <Text style={{ fontSize: 9, color: colors.muted }}>
                  {" "}— Suggested max: {formatCurrency(creditScore.recommendations.suggested_max_amount)}
                </Text>
              )}
            </View>
            <Text style={styles.paragraph}>
              {creditScore.recommendations.narrative}
            </Text>
            {creditScore.recommendations.strengths.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={[styles.bold, { fontSize: 9, marginBottom: 3 }]}>
                  Strengths:
                </Text>
                {creditScore.recommendations.strengths.map((s, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={styles.bullet}>+</Text>
                    <Text style={styles.bulletText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}
            {creditScore.recommendations.concerns.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={[styles.bold, { fontSize: 9, marginBottom: 3 }]}>
                  Concerns:
                </Text>
                {creditScore.recommendations.concerns.map((c, i) => (
                  <View key={i} style={styles.bulletItem}>
                    <Text style={[styles.bullet, { color: colors.red }]}>!</Text>
                    <Text style={styles.bulletText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}
            {creditScore.recommendations.conditions.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={[styles.bold, { fontSize: 9, marginBottom: 3 }]}>
                  Conditions:
                </Text>
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

        {/* Loan History */}
        {loans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Loan History ({loans.length} record{loans.length > 1 ? "s" : ""})
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Type</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Amount</Text>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Applied</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Maturity</Text>
                <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Term</Text>
              </View>
              {loans.map((loan, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: "15%" }]}>
                    {formatEnumLabel(loan.loanType)}
                  </Text>
                  <Text style={[styles.tableCell, styles.bold, { width: "20%" }]}>
                    {formatCurrency(loan.principalAmount)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "15%" }]}>
                    {formatEnumLabel(loan.status)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "20%", color: colors.muted }]}>
                    {formatDate(loan.applicationDate)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "20%", color: colors.muted }]}>
                    {formatDate(loan.maturityDate)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "10%" }]}>
                    {loan.termMonths}mo
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Cooperative Engagement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cooperative Engagement</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItemThird}>
              <Text style={styles.infoLabel}>Activities Attended</Text>
              <Text style={styles.infoValue}>
                {engagement.activitiesAttended} / {engagement.activitiesInvited}
                {engagement.activitiesInvited > 0 &&
                  ` (${((engagement.activitiesAttended / engagement.activitiesInvited) * 100).toFixed(0)}%)`}
              </Text>
            </View>
            <View style={styles.infoItemThird}>
              <Text style={styles.infoLabel}>Committee Service</Text>
              <Text style={styles.infoValue}>
                {engagement.committees.length} role{engagement.committees.length !== 1 ? "s" : ""}
                {" "}({engagement.committees.filter((c) => c.isActive).length} active)
              </Text>
            </View>
            <View style={styles.infoItemThird}>
              <Text style={styles.infoLabel}>Referrals Made</Text>
              <Text style={styles.infoValue}>{engagement.referralsMade}</Text>
            </View>
          </View>
          {engagement.committees.length > 0 && (
            <View style={[styles.table, { marginTop: 8 }]}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: "45%" }]}>Committee</Text>
                <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Role</Text>
                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Status</Text>
              </View>
              {engagement.committees.map((c, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: "45%" }]}>{c.committeeName}</Text>
                  <Text style={[styles.tableCell, { width: "30%" }]}>
                    {formatEnumLabel(c.role)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { width: "25%", color: c.isActive ? colors.green : colors.muted },
                    ]}
                  >
                    {c.isActive ? "Active" : "Ended"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

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
