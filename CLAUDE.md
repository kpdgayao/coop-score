# CLAUDE.md — CoopScore

## Project Overview

**CoopScore** is an AI-powered credit scoring platform for Philippine cooperatives, built for Oro Integrated Cooperative (OIC) in Cagayan de Oro as the pilot client. It addresses the cooperative sector's challenge of assessing creditworthiness of members who lack formal credit histories (thin-file borrowers) by leveraging cooperative-specific data — member engagement, savings behavior, guarantor networks, and social capital.

### Business Context

- **Client**: Oro Integrated Cooperative (OIC), Cagayan de Oro, Philippines
- **Problem**: High bad debt exposure, difficulty assessing micro-loan applicants, thin/nonexistent credit files
- **Solution**: Rule-based credit scoring using 7 cooperative-specific dimensions, enhanced by AI (Claude) for interviews, narrative analysis, and coaching
- **Regulatory**: Must comply with RA 9520 (Cooperative Code), RA 10173 (Data Privacy Act), RA 9510 (Credit Information System Act), and CDA guidelines
- **Business Case**: See `docs/CoopScore-Business-Case.md` for market analysis and revenue model

---

## Tech Stack

- **Framework**: Next.js 16 (Turbopack), React 19, TypeScript
- **Styling**: Tailwind CSS v4 (CSS variable theming), shadcn/ui, Radix UI
- **Database**: PostgreSQL via Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`)
- **AI**: Anthropic Claude API via `@anthropic-ai/sdk` (model: `claude-sonnet-4-20250514`)
- **Charts**: Recharts
- **Validation**: Zod
- **Deployment**: Railway (PostgreSQL + Next.js)
- **Toasts**: sonner

### Critical Tech Stack Notes

**Prisma 7 + Next.js 16 (Turbopack):**
- Generator must be `prisma-client` (NOT `prisma-client-js`)
- Output: `../src/generated/prisma` — import from `@/generated/prisma/client`
- No `url` in `schema.prisma` datasource — connection string configured via `PrismaPg` adapter in `src/lib/db.ts`
- Must use `@prisma/adapter-pg` with `PrismaPg({ connectionString })` passed to `PrismaClient({ adapter })`
- `serverExternalPackages` in `next.config.ts`: `@anthropic-ai/sdk`, `@prisma/adapter-pg`, `@prisma/client`, `pg`, `@react-pdf/renderer`
- All pages querying the database need `export const dynamic = "force-dynamic"`
- Prisma Decimal != number — use `Number(field)` when passing to functions expecting number
- Nullable JSON fields: use `value ?? undefined` (not `null`) for Prisma createMany

**Tailwind CSS v4:**
- Uses CSS variables for theming, not v3 JIT config
- Custom colors: `brand` (primary), `brand-light` (hover), plus scoring colors via CSS vars

**Next.js 16:**
- Route params are `Promise<{ id: string }>` — must `await params`
- `useSearchParams()` requires `<Suspense>` boundary
- Turbopack is mandatory for dev

---

## Project Structure

```
coop-score/
├── CLAUDE.md                 # This file — project context for Claude Code
├── README.md                 # Project README with setup instructions
├── docs/
│   └── CoopScore-Business-Case.md  # Stakeholder business case & revenue model
├── prisma/
│   ├── schema.prisma         # Database schema (16 models)
│   └── seed.ts               # Seed script (200 members, 80 loans, activities, scores)
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Redirect to /dashboard
│   │   ├── (dashboard)/      # Dashboard layout group (sidebar + header)
│   │   │   ├── layout.tsx    # Sidebar + header + toaster
│   │   │   ├── error.tsx     # Error boundary (client component with reset)
│   │   │   ├── not-found.tsx # 404 page
│   │   │   ├── dashboard/    # Overview with alerts, stats, score distribution
│   │   │   │   ├── page.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── members/      # Member list, detail, and registration
│   │   │   │   ├── page.tsx        # List with search/filter + "New Member" button
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx    # Registration form (CDO barangays, auto membership number)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # Profile with score, loans, AI actions, "Apply for Loan"
│   │   │   │       └── loading.tsx
│   │   │   ├── loans/        # Loan list, detail, and application
│   │   │   │   ├── page.tsx        # List with status filters
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx    # Application form (accepts ?memberId query param)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # Detail + AI actions (narrative, interview)
│   │   │   │       └── loading.tsx
│   │   │   ├── scoring/      # Credit scoring interface
│   │   │   │   ├── page.tsx        # Batch/individual scoring (batch disabled for demo)
│   │   │   │   └── loading.tsx
│   │   │   ├── activities/   # Activity log
│   │   │   │   ├── page.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── reports/      # Analytics and reports
│   │   │   │   └── page.tsx
│   │   │   └── settings/     # System settings
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── members/
│   │       │   ├── route.ts        # GET (list/search), POST (create with duplicate check)
│   │       │   └── [id]/
│   │       │       └── route.ts    # DELETE (safe — blocks if has loans/scores)
│   │       ├── loans/
│   │       │   └── route.ts        # GET, POST
│   │       ├── scoring/
│   │       │   └── route.ts        # POST (individual/batch scoring)
│   │       └── ai/
│   │           ├── loan-interview/
│   │           │   └── route.ts    # POST (start/continue/complete/assess)
│   │           ├── score-explain/
│   │           │   └── route.ts    # POST
│   │           ├── narrative-analysis/
│   │           │   └── route.ts    # POST
│   │           ├── what-if-coach/
│   │           │   └── route.ts    # POST
│   │           └── anomaly-detect/
│   │               └── route.ts    # POST (disabled for demo — returns 403)
│   ├── components/
│   │   ├── ui/               # shadcn/ui components (Button, Card, Badge, Table, etc.)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx         # Fixed sidebar with grouped nav (Main, Operations, Admin)
│   │   │   ├── header.tsx          # Mobile menu, search, notifications, user dropdown
│   │   │   └── breadcrumbs.tsx     # Auto-generated from URL path
│   │   ├── ai/
│   │   │   ├── interview-chat.tsx        # Multilingual loan interview chat UI
│   │   │   ├── loan-ai-actions.tsx       # Container for narrative + interview on loan page
│   │   │   ├── narrative-assessment.tsx  # Narrative analysis display card
│   │   │   └── ai-loading-indicator.tsx  # Shared AI loading spinner
│   │   ├── scoring/
│   │   │   ├── score-gauge.tsx           # Animated SVG arc gauge with score count-up
│   │   │   ├── score-history.tsx         # Score trend chart
│   │   │   ├── member-ai-actions.tsx     # Score explainer + what-if on member page
│   │   │   └── what-if-simulator.tsx     # What-if simulation UI
│   │   └── charts/
│   │       └── score-distribution-chart.tsx  # Recharts BarChart for dashboard
│   ├── lib/
│   │   ├── db.ts             # Prisma client singleton (PrismaPg adapter, SSL config)
│   │   ├── utils.ts          # cn() helper (clsx + tailwind-merge)
│   │   ├── format.ts         # Centralized format/color utilities (currency, dates, status colors)
│   │   ├── scoring/
│   │   │   ├── engine.ts           # Main scoring orchestrator
│   │   │   ├── types.ts            # Scoring types, weights, ranges, progressive ladder
│   │   │   ├── thin-file.ts        # Thin-file detection and weight redistribution
│   │   │   ├── progressive-ladder.ts
│   │   │   └── dimensions/         # 7 scoring dimension calculators
│   │   │       ├── repayment-history.ts    (25% standard, 0% thin-file)
│   │   │       ├── capital-buildup.ts      (20% standard, 28% thin-file)
│   │   │       ├── cooperative-engagement.ts (20% standard, 30% thin-file)
│   │   │       ├── membership-maturity.ts  (10% standard, 15% thin-file)
│   │   │       ├── loan-utilization.ts     (10% standard, 0% thin-file)
│   │   │       ├── guarantor-network.ts    (10% standard, 17% thin-file)
│   │   │       └── demographics.ts         (5% standard, 10% thin-file)
│   │   └── ai/
│   │       ├── client.ts            # Anthropic SDK wrapper (retry, rate limiter, streaming)
│   │       ├── schemas.ts           # Zod schemas for all AI response types
│   │       ├── narrative-analysis.ts # Loan purpose analysis (integrates interview data)
│   │       ├── score-explainer.ts   # Natural language credit memo
│   │       ├── anomaly-detection.ts # Behavior anomaly detection
│   │       ├── loan-interview.ts    # Interview logic (start, continue, complete, assess)
│   │       └── what-if-coach.ts     # Personalized score improvement coaching
│   └── generated/
│       └── prisma/             # Generated Prisma client (do not edit)
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env.local                # DATABASE_URL, ANTHROPIC_API_KEY (not committed)
```

---

## Database Schema (16 Models)

All models use `@@map()` for snake_case table names. Key models:

| Model | Table | Purpose |
|-------|-------|---------|
| User | users | Auth, roles (ADMIN, CREDIT_OFFICER, MEMBER) |
| Member | members | Cooperative members with profile data |
| ShareCapital | share_capital | Share capital transactions |
| SavingsTransaction | savings_transactions | Savings deposits/withdrawals |
| Loan | loans | Loan applications and lifecycle |
| LoanPayment | loan_payments | Payment schedule and tracking |
| Guarantor | guarantors | Loan guarantor relationships |
| CoopActivity | coop_activities | GA, trainings, seminars, etc. |
| ActivityAttendance | activity_attendance | Member attendance records |
| CommitteeService | committee_service | Committee roles and terms |
| MemberReferral | member_referrals | Member-to-member referrals |
| CoopServiceUsage | coop_service_usage | Non-lending service usage |
| CreditScore | credit_scores | Computed scores with dimension breakdown (JSON) |
| AnomalyAlert | anomaly_alerts | AI-detected behavioral anomalies |
| LoanInterview | loan_interviews | AI interview transcripts and assessments |
| AIApiLog | ai_api_logs | API call logging for cost monitoring |

---

## Credit Scoring Engine

### Score Range: 300-850

| Score | Category | Recommendation |
|-------|----------|----------------|
| 750-850 | Excellent | Auto-approve up to 5x CBU |
| 650-749 | Good | Standard approval up to 3x CBU |
| 550-649 | Fair | Committee review, max 2x CBU |
| 450-549 | Marginal | Enhanced due diligence, max 1x CBU |
| 300-449 | High Risk | Decline or require restructuring |

### Scoring Formula

```
rawScore = sum(dimensionScore[i] * weight[i]) for all dimensions
totalScore = 300 + (rawScore / 100) * 550
if (thinFile) totalScore = min(totalScore, 699)  // THIN_FILE_CEILING
```

### Standard Weights (7 dimensions)

| Dimension | Weight | Key Variables |
|-----------|--------|---------------|
| Repayment History | 25% | On-time rate, DPD frequency, restructuring |
| Capital Build-Up | 20% | CBU growth, voluntary savings, deposit consistency |
| Cooperative Engagement | 20% | GA attendance, training, committee service, volunteerism |
| Membership Maturity | 10% | Tenure, continuous standing, PMES, multi-product |
| Loan Utilization | 10% | Purpose alignment, loan-to-CBU ratio, cycling |
| Guarantor Network | 10% | Count, quality, diversity, default exposure |
| Demographics | 5% | Age, employment, income, geographic proximity |

### Thin-File Weights (no repayment/loan history)

Repayment History and Loan Utilization drop to 0%. Remaining dimensions are redistributed: Capital (28%), Engagement (30%), Maturity (15%), Guarantor (17%), Demographics (10%). Score ceiling: 699.

### Progressive Lending Ladder

| Stage | Ceiling | Requirements |
|-------|---------|-------------|
| Entry | PHP 5K-10K | 3 months membership, PMES done, 1 guarantor |
| Level 2 | PHP 10K-25K | Entry repaid, 6+ months |
| Level 3 | PHP 25K-50K | Level 2 done, 1+ year, 2 guarantors |
| Standard | PHP 50K-500K | Full scoring model applies |

---

## AI Features (Claude API)

All AI features use Claude Sonnet (`claude-sonnet-4-20250514`) via `src/lib/ai/client.ts`. The rule-based score is always computed independently — AI enhances but never replaces the core engine. AI failures degrade gracefully (score still computed, just without AI memo).

### Feature 1: Narrative Analysis (`narrative-analysis.ts`)

Analyzes loan purpose text against member profile. **Now integrates interview data** — if a completed interview assessment exists, it's included in the prompt so the narrative score reflects actual interview findings (coherence, financial literacy, risk flags).

- Input: Loan purpose, member profile, previous loan purposes, interview assessment (if available)
- Output: score (0-100), risk_level, flags[], reasoning, purpose_category, alignment_with_profile
- Stored in: `Loan.narrativeAssessment` (JSON)

### Feature 2: Score Explainer (`score-explainer.ts`)

Generates human-readable credit memo from the 7-dimension score breakdown.

- Input: All dimension scores, member context, scoring pathway
- Output: narrative, strengths[], concerns[], recommendation, suggested_max_amount, conditions[], improvement_tips[]
- Stored in: `CreditScore.recommendations` (JSON)

### Feature 3: Anomaly Detection (`anomaly-detection.ts`)

Batch analysis flagging unusual member behavior (withdrawal spikes, attendance drops, guarantor concentration, manufactured patterns).

- Input: Member activity summary (90 days)
- Output: Array of alerts with alertType, severity, description, evidence
- Stored in: `AnomalyAlert` table
- **Currently disabled for demo** (API returns 403)

### Feature 4: Loan Interview (`loan-interview.ts`)

Guided AI interview with cooperative loan applicants. Supports **English, Bisaya (CDO style), and Filipino**.

- Minimum 8 exchanges (16 messages) before auto-completion
- 5 required topics: Business Plan, Loan Terms, Household Finances, Purpose Feasibility, Coop Obligations
- Topic detection uses keyword matching (50+ Bisaya keywords included)
- Language stored in first transcript entry and persisted across turns
- Manual "End Interview" available after 2+ exchanges
- Post-interview assessment: overall_score, financial_literacy_score, business_viability_score, coherence_score, risk_flags, summary, recommendation
- Stored in: `LoanInterview` table (transcript JSON + assessment JSON)

### Feature 5: What-If Coach (`what-if-coach.ts`)

Personalized coaching based on what-if simulation results. Read-only — not saved to database.

- Input: Current score, simulated actions and impacts, member context
- Output: coaching_message, priority_actions[], next_milestone

### AI Infrastructure

- **Client**: `src/lib/ai/client.ts` — singleton Anthropic SDK, retry with exponential backoff (3 attempts), token bucket rate limiter (30 req/min)
- **Schemas**: `src/lib/ai/schemas.ts` — Zod validation for all 5 AI response types. `parseAIResponse()` extracts JSON from markdown code blocks.
- **Cost logging**: All API calls logged to `AIApiLog` table (tokens, latency, cost estimate)
- **Cost**: ~PHP 440/month (~$8) for 200 members, 50 loans/month

---

## UI Architecture

### Layout
- Sidebar: Fixed left (desktop), sheet (mobile). Grouped nav: Main (Dashboard, Members, Loans), Operations (Scoring, Activities), Admin (Reports, Settings). OIC branding.
- Header: Mobile menu toggle, search bar, notifications badge, user dropdown
- Breadcrumbs: Auto-generated from URL path. UUIDs display as "Details".

### Patterns
- **Loading**: Every route has `loading.tsx` with Skeleton components
- **Error boundaries**: `error.tsx` (client component with reset) + `not-found.tsx`
- **Toasts**: sonner library, `<Toaster />` in layout
- **Format utilities**: All color/label functions centralized in `src/lib/format.ts`
- **Score gauge**: Animated SVG arc with colored segments, odometer number count-up (`score-gauge.tsx`)
- **AI loading**: Use `AILoadingIndicator` component for AI operations
- **Overflow protection**: `break-words`, `line-clamp-*`, `truncate` on long text fields
- **Interview chat**: Plain `div` with `overflow-y-auto` + `min-h-0` (not Radix ScrollArea — it breaks flex constraints)

### Color Theme
- Primary: `brand` (teal-based)
- Risk colors: emerald (excellent/good), amber (fair/warning), red (high risk/default)
- Status badges use `bg-{color}-100 text-{color}-800` pattern

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/members` | List members (search, filter by status, paginate) |
| POST | `/api/members` | Create member (Zod validation, duplicate check on name+DOB) |
| DELETE | `/api/members/[id]` | Delete member (blocks if has loans or scores) |
| GET | `/api/loans` | List loans |
| POST | `/api/loans` | Create loan application |
| POST | `/api/scoring` | Compute credit score (individual or batch) |
| POST | `/api/ai/loan-interview` | AI interview (actions: start, continue, complete, assess) |
| POST | `/api/ai/score-explain` | AI score explanation |
| POST | `/api/ai/narrative-analysis` | AI narrative analysis |
| POST | `/api/ai/what-if-coach` | AI what-if simulation |
| POST | `/api/ai/anomaly-detect` | AI anomaly detection (disabled for demo) |

---

## Environment Variables

```
DATABASE_URL=postgresql://...          # PostgreSQL connection string
ANTHROPIC_API_KEY=sk-ant-...           # Claude API key
AI_MODEL=claude-sonnet-4-20250514      # Model to use (optional, has default)
AI_MAX_TOKENS=2048                     # Max response tokens (optional)
AI_RATE_LIMIT_PER_MINUTE=30            # Rate limit (optional)
```

---

## Development Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # prisma generate && next build
npm start            # Production server
npm run db:migrate   # prisma migrate deploy
npm run db:seed      # npx tsx prisma/seed.ts
```

---

## Key Implementation Rules

- Use TypeScript strict mode
- Server components by default; client components only for interactivity
- Prisma for all database operations — no raw SQL
- The rule-based score is always computed first and independently of AI
- AI failures must never block core functionality — graceful degradation
- All AI responses validated through Zod schemas
- Cache AI outputs in database — don't regenerate on every page load
- Currency: Philippine Peso (PHP) — `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`
- Never expose raw AI prompts to the frontend — all AI goes through API routes
- Recharts Tooltip `formatter` prop: don't annotate parameter types (strict recharts types)
- Use `JSON.parse(JSON.stringify(data))` when writing complex objects to Prisma JSON fields
