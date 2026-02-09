-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CREDIT_OFFICER', 'MEMBER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "CivilStatus" AS ENUM ('SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('EMPLOYED', 'SELF_EMPLOYED', 'BUSINESS_OWNER', 'FARMER', 'UNEMPLOYED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ShareCapitalTransactionType" AS ENUM ('CONTRIBUTION', 'WITHDRAWAL', 'DIVIDEND_REINVESTMENT', 'PATRONAGE_REINVESTMENT');

-- CreateEnum
CREATE TYPE "SavingsAccountType" AS ENUM ('REGULAR', 'TIME_DEPOSIT', 'SPECIAL');

-- CreateEnum
CREATE TYPE "SavingsTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INTEREST_CREDIT');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('MICRO', 'REGULAR', 'EMERGENCY', 'EDUCATIONAL', 'LIVELIHOOD', 'HOUSING');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'APPROVED', 'RELEASED', 'CURRENT', 'PAID', 'DELINQUENT', 'DEFAULT', 'RESTRUCTURED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('ON_TIME', 'LATE', 'MISSED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "GuarantorStatus" AS ENUM ('ACTIVE', 'CALLED', 'RELEASED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('GENERAL_ASSEMBLY', 'TRAINING', 'SEMINAR', 'COMMITTEE_MEETING', 'COMMUNITY_SERVICE', 'VOLUNTEER', 'ELECTION');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('FINANCIAL_LITERACY', 'GOVERNANCE', 'LIVELIHOOD', 'COOPERATIVE_PRINCIPLES', 'OTHER');

-- CreateEnum
CREATE TYPE "CommitteeRole" AS ENUM ('MEMBER', 'SECRETARY', 'VICE_CHAIR', 'CHAIR');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('STORE', 'INSURANCE', 'RICE_SUBSIDY', 'MEDICAL', 'FUNERAL', 'CALAMITY');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'MARGINAL', 'HIGH_RISK');

-- CreateEnum
CREATE TYPE "ScoringPathway" AS ENUM ('STANDARD', 'THIN_FILE');

-- CreateEnum
CREATE TYPE "ComputedBy" AS ENUM ('SYSTEM', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('WITHDRAWAL_SPIKE', 'ATTENDANCE_DROP', 'HOUSEHOLD_CLUSTER', 'GUARANTOR_CONCENTRATION', 'MANUFACTURED_PATTERN', 'RAPID_LOAN_CYCLING', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('NEW', 'REVIEWED', 'DISMISSED', 'ACTIONED');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CREDIT_OFFICER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "membershipNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "civilStatus" "CivilStatus" NOT NULL,
    "barangay" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Cagayan de Oro',
    "province" TEXT NOT NULL DEFAULT 'Misamis Oriental',
    "contactNumber" TEXT NOT NULL,
    "email" TEXT,
    "employmentType" "EmploymentType" NOT NULL,
    "employerOrBusiness" TEXT,
    "monthlyIncome" DECIMAL(12,2) NOT NULL,
    "membershipDate" TIMESTAMP(3) NOT NULL,
    "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "pmesCompletionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_capital" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "transactionType" "ShareCapitalTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "runningBalance" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_capital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_transactions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "accountType" "SavingsAccountType" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "transactionType" "SavingsTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "runningBalance" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "loanType" "LoanType" NOT NULL,
    "principalAmount" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,4) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL,
    "approvalDate" TIMESTAMP(3),
    "releaseDate" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT NOT NULL,
    "approvedById" TEXT,
    "narrativeAssessment" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_payments" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "amountDue" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "principal" DECIMAL(12,2) NOT NULL,
    "interest" DECIMAL(12,2) NOT NULL,
    "penalty" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'MISSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guarantors" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "guarantorMemberId" TEXT NOT NULL,
    "guaranteedAmount" DECIMAL(12,2) NOT NULL,
    "status" "GuarantorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guarantors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coop_activities" (
    "id" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cetfFunded" BOOLEAN NOT NULL DEFAULT false,
    "category" "ActivityCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coop_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_attendance" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "activity_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "committee_service" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "committeeName" TEXT NOT NULL,
    "role" "CommitteeRole" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "committee_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredMemberId" TEXT NOT NULL,
    "referralDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coop_service_usage" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coop_service_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_scores" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "scoreDate" TIMESTAMP(3) NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "riskCategory" "RiskCategory" NOT NULL,
    "scoringPathway" "ScoringPathway" NOT NULL,
    "dimensionScores" JSONB NOT NULL,
    "recommendations" JSONB,
    "computedBy" "ComputedBy" NOT NULL DEFAULT 'SYSTEM',
    "modelVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_alerts" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'NEW',
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "anomaly_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_interviews" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "conductedById" TEXT NOT NULL,
    "transcript" JSONB NOT NULL,
    "topicsCovered" TEXT[],
    "assessment" JSONB,
    "status" "InterviewStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "loan_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_api_logs" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "costEstimate" DECIMAL(8,6) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_api_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_membershipNumber_key" ON "members"("membershipNumber");

-- CreateIndex
CREATE INDEX "share_capital_memberId_transactionDate_idx" ON "share_capital"("memberId", "transactionDate");

-- CreateIndex
CREATE INDEX "savings_transactions_memberId_transactionDate_idx" ON "savings_transactions"("memberId", "transactionDate");

-- CreateIndex
CREATE INDEX "loans_memberId_status_idx" ON "loans"("memberId", "status");

-- CreateIndex
CREATE INDEX "loan_payments_loanId_dueDate_idx" ON "loan_payments"("loanId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "guarantors_loanId_guarantorMemberId_key" ON "guarantors"("loanId", "guarantorMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "activity_attendance_activityId_memberId_key" ON "activity_attendance"("activityId", "memberId");

-- CreateIndex
CREATE INDEX "committee_service_memberId_idx" ON "committee_service"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "member_referrals_referrerId_referredMemberId_key" ON "member_referrals"("referrerId", "referredMemberId");

-- CreateIndex
CREATE INDEX "coop_service_usage_memberId_transactionDate_idx" ON "coop_service_usage"("memberId", "transactionDate");

-- CreateIndex
CREATE INDEX "credit_scores_memberId_scoreDate_idx" ON "credit_scores"("memberId", "scoreDate");

-- CreateIndex
CREATE INDEX "anomaly_alerts_memberId_status_idx" ON "anomaly_alerts"("memberId", "status");

-- CreateIndex
CREATE INDEX "loan_interviews_loanId_idx" ON "loan_interviews"("loanId");

-- CreateIndex
CREATE INDEX "ai_api_logs_feature_createdAt_idx" ON "ai_api_logs"("feature", "createdAt");

-- AddForeignKey
ALTER TABLE "share_capital" ADD CONSTRAINT "share_capital_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_transactions" ADD CONSTRAINT "savings_transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarantors" ADD CONSTRAINT "guarantors_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarantors" ADD CONSTRAINT "guarantors_guarantorMemberId_fkey" FOREIGN KEY ("guarantorMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attendance" ADD CONSTRAINT "activity_attendance_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "coop_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attendance" ADD CONSTRAINT "activity_attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "committee_service" ADD CONSTRAINT "committee_service_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_referrals" ADD CONSTRAINT "member_referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_referrals" ADD CONSTRAINT "member_referrals_referredMemberId_fkey" FOREIGN KEY ("referredMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coop_service_usage" ADD CONSTRAINT "coop_service_usage_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_scores" ADD CONSTRAINT "credit_scores_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_alerts" ADD CONSTRAINT "anomaly_alerts_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_alerts" ADD CONSTRAINT "anomaly_alerts_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_interviews" ADD CONSTRAINT "loan_interviews_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_interviews" ADD CONSTRAINT "loan_interviews_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_interviews" ADD CONSTRAINT "loan_interviews_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
