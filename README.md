# CoopScore

AI-powered cooperative credit scoring platform built for **OIC (Oro Integrated Cooperative)** in Cagayan de Oro. CoopScore provides a 7-dimension credit scoring model tailored for cooperative members, many of whom are thin-file borrowers without traditional credit histories.

## Features

### Credit Scoring Engine
- **7-Dimension Scoring Model**: Repayment History, Loan Utilization, Capital Buildup, Membership Maturity, Cooperative Engagement, Demographics, and Guarantor Network
- **Thin-File Support**: Progressive scoring ladder that fairly evaluates members with limited credit history
- **Per-Member Scoring**: Generate and track credit scores over time with full dimension breakdowns

### AI-Powered Features (Claude)
- **Loan Interview**: Guided multilingual interview (English, Bisaya, Filipino) with AI-driven topic coverage and post-interview assessment scoring
- **Score Explainer**: Natural language explanations of credit score components
- **Narrative Analysis**: AI analysis of member financial narratives and patterns
- **What-If Coach**: Simulate how actions (e.g., paying off a loan, increasing savings) would affect a member's score
- **Anomaly Detection**: Flag unusual patterns in scoring or member activity

### Member & Loan Management
- Member registration with duplicate detection
- Loan application with purpose tracking
- Activity logging and history
- Reports and analytics dashboard

## Tech Stack

- **Framework**: Next.js 16 (Turbopack), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui, Radix UI
- **Database**: PostgreSQL with Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`)
- **AI**: Anthropic Claude API via `@anthropic-ai/sdk`
- **Charts**: Recharts
- **Validation**: Zod

## Project Structure

```
src/
  app/
    (dashboard)/          # Dashboard pages (sidebar layout)
      dashboard/          # Overview with alerts and stats
      members/            # Member list, detail, and registration
      loans/              # Loan list, detail, and application
      scoring/            # Credit scoring interface
      activities/         # Activity log
      reports/            # Analytics and reports
      settings/           # System settings
    api/
      members/            # Member CRUD endpoints
      loans/              # Loan endpoints
      scoring/            # Score computation endpoint
      ai/
        loan-interview/   # Multilingual loan interview
        score-explain/    # Score explanation
        narrative-analysis/
        what-if-coach/
        anomaly-detect/
  lib/
    scoring/
      dimensions/         # 7 scoring dimension calculators
      engine.ts           # Scoring engine orchestrator
      thin-file.ts        # Thin-file progressive ladder
      types.ts            # Scoring type definitions
    ai/
      client.ts           # Anthropic SDK client
      loan-interview.ts   # Interview logic (start, continue, assess)
      score-explainer.ts  # Score explanation generator
      narrative-analysis.ts
      what-if-coach.ts
      anomaly-detection.ts
      schemas.ts          # Zod schemas for AI responses
    db.ts                 # Prisma client singleton
  components/
    ui/                   # shadcn/ui components
    ai/                   # AI feature components (interview chat, etc.)
    scoring/              # Score display components (gauge, dimension cards)
prisma/
  schema.prisma           # Database schema (14+ models)
  seed.ts                 # Seed script (200 members, 80 loans, activities, scores)
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Anthropic API key

### Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL="postgresql://..."
ANTHROPIC_API_KEY="sk-ant-..."
```

### Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed the database (optional - creates demo data)
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Production Build

```bash
npm run build
npm start
```

## Scoring Dimensions

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Repayment History | 25% | On-time payments, defaults, payment patterns |
| Loan Utilization | 15% | Borrowing patterns and utilization ratios |
| Capital Buildup | 15% | Savings, share capital, and asset growth |
| Membership Maturity | 10% | Length and consistency of cooperative membership |
| Cooperative Engagement | 10% | Participation in coop activities and governance |
| Demographics | 10% | Employment stability, income, and household factors |
| Guarantor Network | 15% | Strength and reliability of guarantor relationships |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/members` | List members (search, filter, paginate) |
| POST | `/api/members` | Create a new member |
| DELETE | `/api/members/[id]` | Delete a member (no loans/scores) |
| GET | `/api/loans` | List loans |
| POST | `/api/loans` | Create a loan application |
| POST | `/api/scoring` | Compute credit score for a member |
| POST | `/api/ai/loan-interview` | AI loan interview (start/continue/complete/assess) |
| POST | `/api/ai/score-explain` | AI score explanation |
| POST | `/api/ai/narrative-analysis` | AI narrative analysis |
| POST | `/api/ai/what-if-coach` | AI what-if simulation |
| POST | `/api/ai/anomaly-detect` | AI anomaly detection |
