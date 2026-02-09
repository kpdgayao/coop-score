# CLAUDE.md — CoopScore MVP

## Project Overview

**CoopScore** is an AI-powered credit scoring platform for Philippine cooperatives, starting with Oro Integrated Cooperative (OIC) as the pilot client. It addresses the cooperative sector's challenge of assessing creditworthiness of micro-loan applicants who lack formal credit histories (thin-file borrowers) by leveraging cooperative-specific data that only cooperatives possess — member engagement, savings behavior, guarantor networks, and social capital.

### Business Context

- **Client**: Oro Integrated Cooperative (OIC), Cagayan de Oro, Philippines
- **Problem**: High bad debt exposure, difficulty assessing micro-loan applicants, thin/nonexistent credit files
- **Solution**: ML-based credit scoring using internal cooperative data instead of external credit bureaus
- **Regulatory**: Must comply with RA 9520 (Cooperative Code), RA 10173 (Data Privacy Act), RA 9510 (Credit Information System Act), and CDA guidelines

---

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API routes + Python ML pipeline
- **Database**: PostgreSQL (via Prisma ORM)
- **ML Engine**: Python (scikit-learn, XGBoost) — called via API route or subprocess
- **Auth**: NextAuth.js with role-based access (Admin, Credit Officer, Member)
- **Charts**: Recharts for score visualizations and dashboards

---

## Data Model

### Core Entities

```
Member
├── id (UUID)
├── membershipNumber (string, unique)
├── firstName, middleName, lastName
├── dateOfBirth
├── gender
├── civilStatus
├── address (barangay, city, province)
├── contactNumber
├── email (optional)
├── employmentType (employed | self-employed | business-owner | farmer | unemployed)
├── employerOrBusiness (string, optional)
├── monthlyIncome (decimal)
├── membershipDate
├── membershipStatus (active | inactive | terminated)
├── pmesCompletionDate (Pre-Membership Education Seminar)
├── createdAt, updatedAt

ShareCapital
├── id
├── memberId (FK)
├── transactionDate
├── transactionType (contribution | withdrawal | dividend_reinvestment | patronage_reinvestment)
├── amount (decimal)
├── runningBalance (decimal)
├── notes

SavingsAccount
├── id
├── memberId (FK)
├── accountType (regular | time_deposit | special)
├── transactionDate
├── transactionType (deposit | withdrawal | interest_credit)
├── amount (decimal)
├── runningBalance (decimal)

Loan
├── id
├── memberId (FK)
├── loanType (micro | regular | emergency | educational | livelihood | housing)
├── principalAmount (decimal)
├── interestRate (decimal)
├── termMonths (integer)
├── applicationDate
├── approvalDate (nullable)
├── releaseDate (nullable)
├── maturityDate
├── status (pending | approved | released | current | paid | delinquent | default | restructured)
├── purpose (string)
├── approvedBy (FK to User)

LoanPayment
├── id
├── loanId (FK)
├── dueDate
├── paymentDate (nullable)
├── amountDue (decimal)
├── amountPaid (decimal)
├── principal (decimal)
├── interest (decimal)
├── penalty (decimal)
├── status (on_time | late | missed | partial)

Guarantor
├── id
├── loanId (FK)
├── guarantorMemberId (FK to Member)
├── guaranteedAmount (decimal)
├── status (active | called | released)

CoopActivity
├── id
├── activityType (general_assembly | training | seminar | committee_meeting | community_service | volunteer | election)
├── title (string)
├── date
├── cetfFunded (boolean)
├── category (financial_literacy | governance | livelihood | cooperative_principles | other)

ActivityAttendance
├── id
├── activityId (FK)
├── memberId (FK)
├── attended (boolean)

CommitteeService
├── id
├── memberId (FK)
├── committeeName (string)
├── role (member | secretary | vice_chair | chair)
├── startDate
├── endDate (nullable)
├── isActive (boolean)

MemberReferral
├── id
├── referrerId (FK to Member)
├── referredMemberId (FK to Member)
├── referralDate

CoopServiceUsage
├── id
├── memberId (FK)
├── serviceType (store | insurance | rice_subsidy | medical | funeral | calamity)
├── transactionDate
├── amount (decimal)

CreditScore
├── id
├── memberId (FK)
├── scoreDate
├── totalScore (integer, 300-850)
├── riskCategory (excellent | good | fair | marginal | high_risk)
├── scoringPathway (standard | thin_file)
├── dimensionScores (JSON — breakdown per dimension)
├── recommendations (JSON — auto-generated lending recommendations)
├── computedBy (system | manual_override)
├── modelVersion (string)
```

---

## Credit Scoring Engine

### Standard Model (7 Dimensions)

For members WITH repayment history:

| # | Dimension | Weight | Key Variables |
|---|-----------|--------|---------------|
| 1 | Repayment History | 25% | On-time rate, DPD frequency, restructuring count, collection actions |
| 2 | Capital Build-Up Behavior | 20% | CBU growth trend, voluntary savings ratio, deposit consistency, deposit-to-withdrawal ratio |
| 3 | Cooperative Engagement & Social Capital | 20% | GA attendance rate (25%), financial literacy training attendance (20%), committee service (15%), patronage of non-lending services (15%), volunteerism (10%), guarantor track record (10%), member referrals (5%) |
| 4 | Membership Maturity & Stability | 10% | Tenure, continuous good standing, PMES completion, multi-product adoption |
| 5 | Loan Utilization & Behavior | 10% | Purpose alignment, loan-to-CBU ratio, multi-loan management, early repayment, loan cycling |
| 6 | Guarantor Network Quality | 10% | Available guarantors count, guarantor creditworthiness, diversity, reciprocal ratio, default exposure |
| 7 | Demographics & External Factors | 5% | Age, employment stability, income diversity, geographic proximity |

### Thin-File Model (First-Time Borrowers / Micro-Loan Applicants)

For members WITHOUT repayment history — weight redistribution:

| # | Dimension | Thin-File Weight |
|---|-----------|-----------------|
| 1 | Repayment History | 0% (removed) |
| 2 | Capital Build-Up Behavior | 28% |
| 3 | Cooperative Engagement & Social Capital | 30% |
| 4 | Membership Maturity & Stability | 15% |
| 5 | Loan Utilization & Behavior | 0% (removed) |
| 6 | Guarantor Network Quality | 17% |
| 7 | Demographics & External Factors | 10% |

**Score ceiling for thin-file members: 699 (cannot exceed Good until first loan cycle completed)**

### Proxy Indicators for Thin-File Members

Replace repayment history with:
- Savings Discipline Score (CBU contribution consistency, voluntary savings, trend direction)
- Pre-Membership & Onboarding Behavior (speed of share capital completion, training attendance in first 6 months, service adoption rate)
- Guarantor Willingness Index (number of willing guarantors, their quality and diversity)
- External Income Verification (barangay business permit, DTI registration, employment certificate)

### Score Ranges

| Score | Category | Recommended Action |
|-------|----------|-------------------|
| 750–850 | Excellent | Auto-approve up to 5x CBU, lowest interest tier |
| 650–749 | Good | Standard approval up to 3x CBU |
| 550–649 | Fair | Credit committee review required, max 2x CBU |
| 450–549 | Marginal | Enhanced due diligence, max 1x CBU, strong guarantors required |
| 300–449 | High Risk | Decline or require restructuring first |

### Progressive Lending Ladder (Micro-Loans)

| Stage | Loan Ceiling | Requirements | Graduation Criteria |
|-------|-------------|--------------|-------------------|
| Entry | ₱5K–₱10K | 3 months membership, PMES done, 1 guarantor | Full repayment within term |
| Level 2 | ₱10K–₱25K | Entry loan repaid, 6+ months membership | On-time repayment, no restructuring |
| Level 3 | ₱25K–₱50K | Level 2 done, 1+ year membership, 2 guarantors | Consistent savings + full repayment |
| Standard | >₱50K | Full scoring model applies | Has repayment history now |

---

## AI Integration (Phase 1)

The rule-based scoring engine is the source of truth for the credit score number. The AI layer (Claude API via Anthropic SDK) wraps around it to provide interpretation, narrative analysis, anomaly detection, and coaching. This keeps the system auditable and explainable for CDA compliance while being AI-powered.

### Architecture

```
┌──────────────────────────────────────────────────┐
│              Next.js Frontend                     │
├──────────────────────────────────────────────────┤
│              API Routes Layer                     │
├────────────┬────────────────┬────────────────────┤
│ Rule-Based │  Claude API    │   PostgreSQL       │
│ Scoring    │  Integration   │   (Prisma)         │
│ Engine     │                │                    │
│ (core)     │ • Narrative    │ • Member data      │
│            │   Analysis     │ • Scores           │
│ Computes   │ • Score        │ • Transactions     │
│ the number │   Explainer    │ • AI outputs       │
│            │ • Anomaly      │   (cached)         │
│            │   Detection    │                    │
│            │ • Loan         │                    │
│            │   Interview    │                    │
│            │ • What-If      │                    │
│            │   Coach        │                    │
└────────────┴────────────────┴────────────────────┘
```

### AI Feature 1: LLM-Powered Narrative Risk Assessment

When a member applies for a loan and states the purpose (e.g., "I want to buy a tricycle for my habal-habal business"), the LLM analyzes the narrative text for risk signals beyond simple category assignment.

**What it does:**
- Analyzes loan purpose narratives for vagueness, inconsistency with member profile, unrealistic projections
- Scores the narrative on a 0–100 scale that feeds as a sub-variable into the Loan Utilization dimension (for standard model) or as a proxy indicator (for thin-file model)
- Flags red flags: purposes misaligned with stated employment/income, overly generic descriptions, or patterns associated with default risk
- Returns structured JSON with score, risk_level, flags[], and reasoning text

**Implementation:**
- Location: `src/lib/ai/narrative-analysis.ts`
- Trigger: Called when a loan application is submitted with a purpose/description field
- API call: Claude API with a structured system prompt containing the member's profile context (employment, income, membership tenure, prior loan purposes if any)
- The system prompt must instruct Claude to return ONLY valid JSON matching the `NarrativeAssessment` type
- Cache the result in the Loan record (`narrativeAssessment` JSON field)
- Display the assessment in the loan application review UI with the flags highlighted

**Data model addition:**
```
// Add to Loan entity
narrativeAssessment: JSON (nullable)
// Shape: {
//   score: number (0-100),
//   risk_level: "low" | "medium" | "high",
//   flags: string[],
//   reasoning: string,
//   purpose_category: string (auto-classified),
//   alignment_with_profile: "strong" | "moderate" | "weak" | "misaligned"
// }
```

**System prompt template:**
```
You are a credit analyst for a Philippine cooperative. Analyze the following
loan application narrative and member profile. Assess the loan purpose for:
1. Clarity and specificity (vague = higher risk)
2. Alignment with the member's employment/income profile
3. Realistic scope given the loan amount requested
4. Productive vs. consumptive purpose
5. Any red flags or inconsistencies

Member Profile:
- Employment: {employmentType}
- Business/Employer: {employerOrBusiness}
- Monthly Income: ₱{monthlyIncome}
- Membership Tenure: {tenureMonths} months
- Previous Loan Purposes: {previousPurposes}

Loan Application:
- Amount Requested: ₱{amount}
- Stated Purpose: "{purpose}"
- Loan Type: {loanType}

Return ONLY a JSON object with: score (0-100), risk_level, flags[], reasoning,
purpose_category, alignment_with_profile.
```

### AI Feature 2: AI Credit Analyst — Natural Language Score Explainability

After the rule-based engine computes a score, the LLM generates a human-readable credit memo that a credit officer can immediately act on — like a senior credit analyst's written assessment.

**What it does:**
- Takes the structured score breakdown (all 7 dimension scores + sub-variables) and member context
- Generates a 3–5 sentence credit narrative highlighting strengths, concerns, and a clear recommendation
- For thin-file members, explicitly explains why the alternative scoring pathway was used and what the member can do to build their credit profile
- For members near a score threshold boundary (e.g., 545 vs. 555), calls this out so the credit officer can apply judgment

**Implementation:**
- Location: `src/lib/ai/score-explainer.ts`
- Trigger: Called after every score computation (batch or individual)
- The explanation is stored in the `CreditScore.recommendations` JSON field
- Display prominently on the member profile page's credit score section and in the loan application assessment view

**Data model addition:**
```
// CreditScore.recommendations JSON shape:
{
  narrative: string,           // The human-readable credit memo
  strengths: string[],         // Top 2-3 positive factors
  concerns: string[],          // Top 2-3 risk factors
  recommendation: string,      // "approve" | "approve_with_conditions" | "review" | "decline"
  suggested_max_amount: number, // Based on score tier and CBU
  conditions: string[],        // e.g. ["Require 2 guarantors", "Limit to 12-month term"]
  improvement_tips: string[]   // Actionable steps to improve score
}
```

**System prompt template:**
```
You are a senior credit analyst at a Philippine cooperative (Oro Integrated
Cooperative). Write a concise credit assessment memo based on the following
score breakdown. Write in professional but accessible language — the audience
is a credit committee composed of cooperative officers, not data scientists.

Member: {firstName} {lastName} (Member #{membershipNumber})
Membership Since: {membershipDate}
Scoring Pathway: {standard | thin_file}

Overall Score: {totalScore}/850 — {riskCategory}

Dimension Breakdown:
1. Repayment History: {score}/100 (weight: {weight}%)
   - On-time payment rate: {onTimeRate}%
   - Days past due incidents: {dpdCount}
   {... other sub-variables}
2. Capital Build-Up: {score}/100 (weight: {weight}%)
   - CBU balance: ₱{cbuBalance}
   - Monthly growth trend: {trend}
   {... etc for all dimensions}

Return ONLY a JSON object with: narrative, strengths[], concerns[],
recommendation, suggested_max_amount, conditions[], improvement_tips[].
```

### AI Feature 3: Anomaly Detection on Member Behavior

Periodic batch analysis that flags unusual member behavior patterns the rule-based system wouldn't catch.

**What it does:**
- Detects sudden CBU withdrawals before loan applications
- Flags previously active members who stop attending GAs
- Identifies multiple members from the same household/address applying simultaneously
- Catches guarantor concentration (same member guaranteeing too many loans)
- Spots manufactured savings patterns (identical amounts on identical dates suggesting artificial consistency)
- Detects rapid loan cycling (borrow → repay → immediately borrow again)

**Implementation:**
- Location: `src/lib/ai/anomaly-detection.ts`
- Trigger: Scheduled batch job (daily or weekly via cron/API route), also triggered on-demand from the dashboard
- For each member with recent activity, compile a structured activity summary (last 90 days of transactions, attendance, loan events) and send to Claude API
- The LLM receives the activity summary and a checklist of anomaly patterns to look for
- Results stored in a new `AnomalyAlert` table and surfaced on the dashboard

**Data model addition:**
```
AnomalyAlert
├── id (UUID)
├── memberId (FK)
├── alertType (withdrawal_spike | attendance_drop | household_cluster |
│              guarantor_concentration | manufactured_pattern |
│              rapid_loan_cycling | other)
├── severity (low | medium | high)
├── description (string — LLM-generated explanation)
├── evidence (JSON — the specific data points that triggered the alert)
├── status (new | reviewed | dismissed | actioned)
├── reviewedBy (FK to User, nullable)
├── reviewNotes (string, nullable)
├── detectedAt (datetime)
├── resolvedAt (datetime, nullable)
```

**System prompt template:**
```
You are a risk monitoring analyst for a Philippine cooperative. Review the
following member activity summary for the past 90 days and identify any
anomalous patterns that may indicate credit risk.

Check specifically for:
1. WITHDRAWAL SPIKE: Unusual CBU or savings withdrawals, especially before loan applications
2. ATTENDANCE DROP: Member who previously attended GAs/trainings regularly but has stopped
3. HOUSEHOLD CLUSTER: Note if address matches other recent loan applicants
4. GUARANTOR CONCENTRATION: Member is guaranteeing an unusually high number of loans
5. MANUFACTURED PATTERN: Savings deposits that appear artificially consistent (exact same amount, exact same date each month — may not reflect real income patterns)
6. RAPID CYCLING: Borrowing immediately after repaying, with increasing amounts

Member Activity Summary:
{structured JSON of recent transactions, attendance, loan events, guarantor activity}

For each anomaly found, return a JSON array of: alertType, severity, description, evidence.
If no anomalies are found, return an empty array.
```

### AI Feature 4: AI Loan Interview Chatbot (Micro-Loan Applicants)

A conversational AI that conducts structured loan interviews for thin-file/micro-loan applicants, collecting qualitative data the rule-based model can't capture.

**What it does:**
- Conducts a guided conversation covering: business plan, income sources, household expenses, financial literacy check, loan purpose elaboration
- Assesses the applicant's understanding of interest rates, repayment schedules, and loan obligations
- Captures qualitative signals: confidence, coherence, specificity of answers
- Generates a structured assessment JSON from the conversation that feeds as a sub-score into the thin-file scoring model
- Stores the full conversation transcript for audit trail

**Implementation:**
- Location: `src/lib/ai/loan-interview.ts` (backend), `src/components/loans/interview-chat.tsx` (frontend)
- Trigger: Credit officer initiates the interview from the loan application page for thin-file members
- Uses Claude API with streaming for real-time chat experience
- The system prompt constrains the conversation to cover all required topics (minimum 5 topics must be covered before the interview is considered complete)
- After the conversation ends, a separate Claude API call analyzes the full transcript and generates the assessment

**Data model addition:**
```
LoanInterview
├── id (UUID)
├── loanId (FK)
├── memberId (FK)
├── conductedBy (FK to User — the credit officer who initiated)
├── transcript (JSON — array of {role, content, timestamp})
├── topicsCovered (string[] — which of the required topics were addressed)
├── assessment (JSON)
├── status (in_progress | completed | cancelled)
├── startedAt, completedAt

// LoanInterview.assessment JSON shape:
{
  overall_score: number (0-100),
  financial_literacy_score: number (0-100),
  business_viability_score: number (0-100),
  coherence_score: number (0-100),
  risk_flags: string[],
  summary: string,
  recommendation: string
}
```

**Interview system prompt template:**
```
You are a friendly and professional loan counselor at Oro Integrated Cooperative
in the Philippines. You are conducting a structured loan interview with a
cooperative member who is applying for a micro-loan.

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

Member Context:
- Name: {firstName} {lastName}
- Membership: {tenureMonths} months
- Employment: {employmentType}
- Requested Amount: ₱{amount}
- Stated Purpose: "{purpose}"
```

**Assessment prompt (post-interview):**
```
Analyze the following loan interview transcript and generate a structured
credit assessment. The interview was conducted with a micro-loan applicant
at a Philippine cooperative.

Transcript:
{full transcript JSON}

Evaluate:
1. Financial literacy (0-100): Does the applicant understand interest rates, repayment schedules, and loan obligations?
2. Business viability (0-100): Is their business plan or livelihood goal realistic and specific?
3. Coherence (0-100): Were their answers consistent, specific, and credible?
4. Risk flags: Any red flags from the conversation?
5. Overall assessment score (0-100)

Return ONLY a JSON object matching the assessment schema.
```

### AI Feature 5: What-If Simulator with AI Coaching

The what-if simulator computes projected score changes, then the LLM wraps the results in personalized, actionable coaching.

**What it does:**
- After the rule-based what-if engine calculates projected score changes for hypothetical actions (e.g., "attend 2 more trainings," "increase CBU by ₱5K"), the LLM interprets the results
- Generates a personalized improvement plan prioritized by impact and feasibility
- Considers the member's specific context — a farmer's capacity to increase CBU is different from a salaried employee's
- Frames coaching in the cooperative's social mission — improving your score = strengthening the cooperative
- For members near a tier boundary, highlights the specific actions needed to cross the threshold

**Implementation:**
- Location: `src/lib/ai/what-if-coach.ts`
- Trigger: Called from the what-if simulator UI after the user runs a simulation
- The coaching response is NOT saved to the database (read-only projection)
- Display as a coaching card/panel adjacent to the what-if simulator results

**System prompt template:**
```
You are a financial coach at a Philippine cooperative. A member has used the
credit score simulator and you need to provide personalized, actionable advice.

Member: {firstName} {lastName}
Current Score: {currentScore}/850 ({riskCategory})
Employment: {employmentType}
Monthly Income: ₱{monthlyIncome}

Simulation Results:
{JSON array of simulated actions and their projected score impacts}

Provide a personalized coaching message that:
1. Prioritizes the 2-3 highest-impact actions the member can realistically take
2. Gives specific timelines (e.g., "By attending the March 15 seminar...")
3. If they're close to a tier boundary, highlight what it takes to cross it
4. Frame improvements in terms of loan eligibility (e.g., "This would qualify you for up to ₱25K")
5. Keep it encouraging and aligned with cooperative values

Return ONLY a JSON with: coaching_message (string), priority_actions[] (each with
action, projected_impact, timeline, feasibility), next_milestone (the next score
tier and what's needed to reach it).
```

### AI Integration — Shared Infrastructure

**Claude API wrapper:**
- Location: `src/lib/ai/client.ts`
- Single Anthropic SDK client instance, configured with API key from env
- Use `claude-sonnet-4-20250514` model for all features (best cost/performance balance for structured output)
- Implement retry logic with exponential backoff
- All prompts must request JSON output; parse and validate with zod schemas
- Log all API calls (prompt token count, response token count, latency) for cost monitoring
- Implement a simple rate limiter to prevent runaway costs during batch operations

**Environment variables to add:**
```
ANTHROPIC_API_KEY=
AI_MODEL=claude-sonnet-4-20250514
AI_MAX_TOKENS=2048
AI_RATE_LIMIT_PER_MINUTE=30
```

**Cost considerations:**
- Narrative analysis: ~500 input tokens + ~300 output tokens per application
- Score explainer: ~800 input tokens + ~500 output tokens per score
- Anomaly detection: ~1500 input tokens + ~400 output tokens per member batch
- Loan interview: ~2000 tokens per conversation turn (streaming)
- What-if coach: ~600 input tokens + ~400 output tokens per simulation
- Estimate: For 200 members with monthly scoring + 50 loan applications/month ≈ ~500K tokens/month

**Zod validation schemas:**
- Location: `src/lib/ai/schemas.ts`
- Define strict zod schemas for every AI response type
- If Claude returns malformed JSON, retry once; if still invalid, fall back to rule-based-only output with a flag indicating AI enhancement was unavailable
- Never let an AI failure block the core scoring engine — the rule-based score must always be computed regardless of AI availability

### File Structure Update for AI

```
src/lib/ai/
├── client.ts              # Anthropic SDK wrapper, retry logic, rate limiter
├── schemas.ts             # Zod schemas for all AI response types
├── narrative-analysis.ts  # Feature 1: Loan purpose narrative assessment
├── score-explainer.ts     # Feature 2: Natural language credit memo
├── anomaly-detection.ts   # Feature 3: Behavior anomaly detection
├── loan-interview.ts      # Feature 4: Structured loan interview
└── what-if-coach.ts       # Feature 5: Personalized score improvement coaching
```

---

## MVP Scope (Phase 1)

### Pages / Features to Build

1. **Dashboard** (`/dashboard`)
   - Summary stats: total members, active loans, average credit score, delinquency rate
   - Score distribution chart (histogram)
   - Recent score computations
   - **AI anomaly alerts panel** (AI Feature 3) — flagged members with unusual behavior patterns, reviewable by credit officers
   - Alerts: members with declining scores, upcoming loan maturities

2. **Member Management** (`/members`)
   - List view with search, filter by status/risk category
   - Member profile page showing:
     - Personal info
     - Share capital history & chart
     - Savings history & chart
     - Loan history
     - Cooperative engagement timeline (activities attended, committees served)
     - Guarantor relationships (who they guarantee / who guarantees them)
     - Current credit score with dimension breakdown radar chart
     - Score history trend line

3. **Credit Score Engine** (`/scoring`)
   - Batch scoring: compute/recompute scores for all members
   - Individual scoring: compute score for a specific member with explainability
   - Score detail view: dimension breakdown with contributing factors
   - **AI credit memo** (AI Feature 2) — auto-generated natural language explanation per score
   - What-if simulator: "If this member attends 2 more trainings and increases CBU by ₱5K, their score would change by X"
   - **AI coaching** (AI Feature 5) — personalized improvement plan from the what-if simulator

4. **Loan Application Assessment** (`/loans`)
   - New loan application form
   - Auto-pull member's credit score and display recommendation
   - **AI narrative analysis** of loan purpose (AI Feature 1) — displayed alongside the score
   - **AI credit memo** (AI Feature 2) — generated automatically after score computation
   - **AI loan interview chatbot** (AI Feature 4) — available for thin-file/micro-loan applicants, initiated by credit officer
   - Flag thin-file members and apply alternative scoring
   - Guarantor selection with quality check
   - Progressive lending ladder tracking
   - Approval workflow (Credit Officer → Committee for Fair/Marginal scores)

5. **Cooperative Activities Tracker** (`/activities`)
   - CRUD for activities (GA, trainings, seminars, community service)
   - Attendance recording (batch upload or individual entry)
   - Activity calendar view

6. **Reports** (`/reports`)
   - Portfolio at risk (PAR) report
   - Score distribution by membership tenure
   - Engagement vs. default correlation analysis
   - Delinquency aging report

7. **Settings** (`/settings`)
   - Scoring model weight configuration (admin can adjust dimension weights)
   - Score range thresholds configuration
   - Progressive lending ladder configuration
   - User management (roles: Admin, Credit Officer, Member read-only)

### MVP Exclusions (Phase 2+)

- CIC/CIBI integration
- Mobile app for members (member-facing portal)
- Inter-cooperative credit data sharing
- ML model training on historical data (Phase 1 uses rule-based scoring + AI enhancement; ML model comes in Phase 2 when enough labeled outcome data is collected)
- SMS/email notifications
- Document upload and OCR (IDs, business permits)
- Fine-tuned domain-specific language model (Phase 1 uses Claude API with prompt engineering)

---

## Scoring Implementation Notes

### Phase 1: Rule-Based Scoring Engine

For the MVP, implement a **deterministic rule-based scoring engine** (not ML yet). Each dimension computes a sub-score from 0–100, then applies the weighted formula:

```
totalScore = 300 + (sum of weighted dimension scores / 100) * 550
```

This maps the 0–100 internal scale to the 300–850 output range.

Each dimension's 0–100 sub-score is computed by a dedicated function that:
1. Queries the relevant data for the member
2. Applies business rules to each sub-variable
3. Returns a weighted sub-score

Example for Capital Build-Up Behavior:
- CBU growth rate > 10% YoY → 30 points
- CBU growth rate 5–10% → 20 points
- CBU growth rate 0–5% → 10 points
- CBU declining → 0 points
- Voluntary savings present → +20 points
- Deposit consistency (no missed months in 12) → +25 points
- Deposit consistency (1–2 missed) → +15 points
- Net saver (deposits > withdrawals) → +25 points
- ...and so on, totaling up to 100

### Phase 2: ML Model

Once OIC has 6–12 months of scored data with actual loan outcomes, train an XGBoost + Logistic Regression champion-challenger model. The rule-based scores become features alongside raw data. Build this as a Python service that the Next.js app calls.

---

## Seed Data

Generate realistic seed data for demo/development:
- 200 sample members with varied profiles
- 12 months of share capital and savings transactions
- 50+ loan records (mix of current, paid, delinquent, defaulted)
- 20+ cooperative activities with attendance records
- Guarantor relationships
- Pre-computed credit scores

Use Filipino names, Cagayan de Oro barangays, and realistic Philippine cooperative amounts (CBU in ₱500–₱50,000 range, micro-loans ₱5K–₱50K, regular loans up to ₱500K).

---

## Design Direction

- **Aesthetic**: Clean, professional, utilitarian — this is a financial tool for credit officers, not a consumer app. Think bank back-office system but modern.
- **Color scheme**: Deep navy primary (#1e293b), teal accent (#0d9488) for positive/good scores, amber (#f59e0b) for warnings, red (#ef4444) for high risk. White/light gray backgrounds.
- **Typography**: Use Inter or similar clean sans-serif — readability is critical for financial data.
- **Key visual**: The credit score should be displayed as a prominent gauge/meter with color gradient from red (300) to green (850), similar to how FICO scores are presented.
- **Charts**: Use Recharts. Radar chart for dimension breakdown, line charts for score trends, bar charts for distributions.

---

## File Structure

```
coopscore/
├── CLAUDE.md (this file)
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx (redirect to /dashboard)
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   ├── narrative-analysis/route.ts
│   │   │   │   ├── score-explain/route.ts
│   │   │   │   ├── anomaly-detect/route.ts
│   │   │   │   ├── loan-interview/route.ts (streaming)
│   │   │   │   └── what-if-coach/route.ts
│   │   │   └── scoring/
│   │   │       └── route.ts
│   │   ├── dashboard/
│   │   ├── members/
│   │   │   ├── page.tsx (list)
│   │   │   └── [id]/
│   │   │       └── page.tsx (profile)
│   │   ├── scoring/
│   │   ├── loans/
│   │   │   ├── page.tsx (list)
│   │   │   ├── new/
│   │   │   │   └── page.tsx (application form)
│   │   │   └── [id]/
│   │   │       ├── page.tsx (detail + AI assessment)
│   │   │       └── interview/
│   │   │           └── page.tsx (AI chatbot interview)
│   │   ├── activities/
│   │   ├── reports/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── nav.tsx
│   │   ├── scoring/
│   │   │   ├── score-gauge.tsx
│   │   │   ├── dimension-radar.tsx
│   │   │   ├── score-history.tsx
│   │   │   ├── what-if-simulator.tsx
│   │   │   └── ai-credit-memo.tsx
│   │   ├── ai/
│   │   │   ├── narrative-assessment.tsx
│   │   │   ├── anomaly-alert-card.tsx
│   │   │   ├── interview-chat.tsx
│   │   │   ├── coaching-panel.tsx
│   │   │   └── ai-loading-indicator.tsx
│   │   ├── members/
│   │   ├── loans/
│   │   └── charts/
│   ├── lib/
│   │   ├── db.ts (Prisma client)
│   │   ├── ai/
│   │   │   ├── client.ts (Anthropic SDK wrapper, retry, rate limiter)
│   │   │   ├── schemas.ts (Zod schemas for all AI responses)
│   │   │   ├── narrative-analysis.ts
│   │   │   ├── score-explainer.ts
│   │   │   ├── anomaly-detection.ts
│   │   │   ├── loan-interview.ts
│   │   │   └── what-if-coach.ts
│   │   ├── scoring/
│   │   │   ├── engine.ts (main scoring orchestrator)
│   │   │   ├── dimensions/
│   │   │   │   ├── repayment-history.ts
│   │   │   │   ├── capital-buildup.ts
│   │   │   │   ├── cooperative-engagement.ts
│   │   │   │   ├── membership-maturity.ts
│   │   │   │   ├── loan-utilization.ts
│   │   │   │   ├── guarantor-network.ts
│   │   │   │   └── demographics.ts
│   │   │   ├── thin-file.ts (alternative scoring pathway)
│   │   │   ├── progressive-ladder.ts
│   │   │   └── types.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

---

## Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/coopscore
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

---

## Getting Started Commands

```bash
npx create-next-app@latest coopscore --typescript --tailwind --eslint --app --src-dir
cd coopscore
npx prisma init
npx shadcn@latest init
# Install dependencies
npm install @prisma/client recharts next-auth lucide-react @anthropic-ai/sdk zod
npm install -D prisma
```

---

## Implementation Priority

Build in this order:
1. Database schema (Prisma) + seed data — include AnomalyAlert and LoanInterview tables
2. Scoring engine (lib/scoring/) — this is the core IP
3. AI infrastructure (lib/ai/client.ts, schemas.ts) — Claude API wrapper, zod schemas
4. AI score explainer (lib/ai/score-explainer.ts) — integrate with scoring engine
5. Member profile page with score display + AI credit memo
6. Dashboard + anomaly alerts panel
7. Loan application assessment + AI narrative analysis
8. AI loan interview chatbot (for thin-file applicants)
9. Activities tracker
10. What-if simulator + AI coaching
11. Reports
12. Settings / weight configuration
7. Reports
8. Settings / weight configuration
9. What-if simulator

---

## Important Notes for Claude Code

- Always use TypeScript strict mode
- Use server components by default, client components only when interactivity is needed (the AI chat interview and what-if simulator require client components)
- Use Prisma for all database operations — no raw SQL
- The scoring engine must be purely functional — given a memberId, it queries all relevant data and returns a deterministic score object with full explainability
- Every score computation must be logged to the CreditScore table with the full dimension breakdown in JSON
- Currency values are in Philippine Peso (₱) — format with `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`
- Date formats should follow Philippine convention (Month DD, YYYY)
- The what-if simulator and AI coaching do NOT save to database — they are read-only projection tools
- Guarantor network is bidirectional — track both "who I guarantee" and "who guarantees me"

### AI-Specific Guidelines
- **The rule-based score is always computed first and independently** — AI features enhance but never replace the core scoring engine
- **AI failures must never block core functionality** — if the Claude API is down or returns invalid JSON, the system must gracefully degrade (show the score without the AI memo, process the loan without narrative analysis, etc.)
- **All AI responses must be validated through zod schemas** — never trust raw LLM output; parse and validate before storing or displaying
- **Use streaming for the loan interview chatbot** — import `@anthropic-ai/sdk` and use `client.messages.stream()` for real-time chat experience
- **Cache AI outputs** — store generated credit memos, narrative assessments, and anomaly alerts in the database so they don't need to be regenerated on every page load
- **Rate limit AI calls** — implement a simple token bucket rate limiter in `lib/ai/client.ts` to prevent runaway API costs during batch operations (e.g., batch scoring 200 members)
- **Log all AI API calls** — track prompt tokens, completion tokens, latency, and cost estimate for each call; store in a simple `AIApiLog` table for cost monitoring
- **System prompts are in English** — but the AI should be instructed to use Filipino-friendly language in user-facing outputs (credit memos, coaching) while keeping technical terms in English
- **Never expose raw AI prompts to the frontend** — all AI interactions go through API routes; the frontend only sends member/loan IDs and receives structured results
