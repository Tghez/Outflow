# Outflow — Personal Finance Tracker

> Automated expense tracking for Israeli bank accounts, powered by AI-driven spending analysis.

Outflow connects directly to Israeli banks and credit-card providers, imports transactions in real-time, auto-categorizes them, and runs an AI advisor that surfaces actionable savings insights — all in a clean Hebrew-first UI.

---

## Features

- **Automatic Bank Sync** — Pull transactions from all major Israeli banks and credit-card companies via a headless-browser scraper (Camoufox-based), running on a nightly cron or on-demand.
- **Smart Categorization** — Keyword rules assign categories the moment a transaction lands. Every assignment is user-overridable.
- **Budget Tracking** — Set monthly budgets per category with green / amber / red thresholds (< 80% / 80–100% / ≥ 100%).
- **Insights Dashboard** — Monthly totals, category breakdowns, and trend charts over rolling months.
- **AI Spending Advisor** — A multi-step LangGraph workflow powered by Anthropic Claude analyzes your spending patterns and returns structured, personalized advice in Hebrew.
- **Security-First** — Bank credentials are encrypted at rest with AES-256-GCM before they ever touch the database. JWTs expire after 30 days.
- **Hebrew RTL UI** — The entire web app is right-to-left, built for Israeli users.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Node.js 22 + Express 4 |
| **Database** | PostgreSQL + Drizzle ORM |
| **Bank Scraper** | `@sergienko4/israeli-bank-scrapers` v8 |
| **AI / LLM** | Anthropic Claude (Sonnet + Haiku) via LangGraph |
| **Observability** | LangSmith (optional tracing) |
| **Web Frontend** | React 18 + Vite + Tailwind CSS |
| **Charts** | Recharts |
| **Validation** | Zod |
| **Auth** | bcryptjs + JSON Web Tokens |
| **Scheduling** | node-cron |

---

## LLM Integration

Outflow integrates Anthropic Claude at two points in the data pipeline:

### 1. LLM Categorizer (`backend/src/services/llm-categorizer.ts`)

When keyword rules cannot confidently classify a transaction, the description is sent to `claude-haiku` (fast, low-cost) which returns the best-matching category from the user's own category list. This runs inline during sync so every new transaction arrives already categorized.

### 2. AI Spending Advisor (`backend/src/services/advisor.ts`)

A three-node **LangGraph** state graph that runs on demand from the `/api/ai/advice` endpoint:

```
gatherData → analyzePatterns → generateAdvice
```

| Node | Responsibility |
|---|---|
| `gatherData` | Queries the DB for 4-month spending history, current-month category breakdown, and all active budgets |
| `analyzePatterns` | Sends the raw numbers to `claude-sonnet` with a structured prompt; returns trend analysis and anomaly flags |
| `generateAdvice` | Takes the analysis and produces a structured JSON response with savings opportunities, a month-end forecast, flexible budget recommendations, and concrete action items |

The advisor response shape (`AdvisorAdvice` in `shared/src/types/advisor.ts`):

```ts
{
  summary: string;               // Hebrew prose overview
  riskLevel: 'low' | 'medium' | 'high';
  monthForecast: {
    projectedTotal: number;      // agorot
    note: string;
  };
  savingOpportunities: Array<{
    categoryId: string;
    suggestion: string;
    potentialSaving: number;
  }>;
  spendingPermissions: Array<{
    categoryId: string;
    recommendedBudget: number;
    reason: string;
  }>;
  generalAdvice: string[];
}
```

**Model routing:** fast tasks (categorization) use `LLM_MODEL_FAST` (Haiku), deep analysis uses `LLM_MODEL_SMART` (Sonnet). Both are configurable via environment variables so you can swap models without touching code.

**Optional tracing:** set `LANGCHAIN_TRACING_V2=true` and add your LangSmith API key to get full prompt/response traces for every advisor run.

---

## Architecture

```
outflow/
├── backend/          Express API, scraper, Drizzle ORM, LLM services
│   └── src/
│       ├── db/       Schema, migrations, seed data
│       ├── lib/      Crypto, JWT, LLM client
│       ├── prompts/  Advisor & categorizer prompt templates
│       ├── routes/   REST endpoints (auth, accounts, transactions, budgets, ai …)
│       └── services/ Advisor (LangGraph), categorizer, scraper, sync, scheduler
├── web/              React + Vite frontend (RTL Hebrew)
│   └── src/
│       ├── api/      Typed API client wrappers
│       ├── views/    Page components (Dashboard, Transactions, Advisor …)
│       └── components/ Shared UI primitives
├── shared/           Types, constants, and utilities shared across packages
│   └── src/
│       ├── types/    Account, Transaction, Category, Budget, Advisor types
│       ├── constants/ Default categories and categorization rules
│       └── utils/    formatAgorot(), budget threshold helpers
├── .env.example
├── package.json      npm workspaces root
└── tsconfig.base.json
```

---

## Prerequisites

- **Node.js** ≥ 22.14.0 (required by the bank scraper)
- **PostgreSQL** ≥ 14
- **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com)

---

## Setup

```bash
# 1. Clone
git clone https://github.com/TalGhez1214/Outflow.git
cd Outflow

# 2. Install dependencies (all workspaces)
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — see Environment Variables section below

# 4. Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the output as ENCRYPTION_KEY in .env

# 5. Generate JWT secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
# Paste the output as JWT_SECRET in .env

# 6. Run migrations
npm run db:migrate

# 7. Seed default categories and rules
npm run db:seed
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ENCRYPTION_KEY` | Yes | 64-char hex string (32 bytes) for AES-256-GCM |
| `JWT_SECRET` | Yes | Long random string for signing JWTs |
| `PORT` | No | API server port (default `3001`) |
| `NODE_ENV` | No | `development` or `production` |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Claude API key |
| `LLM_MODEL_FAST` | No | Model for categorization (default `claude-haiku-4-5-20251001`) |
| `LLM_MODEL_SMART` | No | Model for advisor analysis (default `claude-sonnet-4-6`) |
| `SCRAPER_TIMEOUT_MS` | No | Bank scraper timeout in ms (default `120000`) |
| `LANGCHAIN_TRACING_V2` | No | `true` to enable LangSmith tracing |
| `LANGCHAIN_API_KEY` | No | LangSmith API key |
| `LANGCHAIN_PROJECT` | No | LangSmith project name |

---

## Running the App

```bash
# Start the backend API (port 3001)
npm run dev

# Start the web frontend (Vite dev server)
npm run web

# Trigger a manual bank scrape
npm run scrape

# Database utilities
npm run db:migrate    # apply pending migrations
npm run db:seed       # seed default categories & rules
npm run db:studio     # open Drizzle Studio (visual DB browser)
```

---

## Key Design Decisions

**Amounts in agorot** — All monetary values are stored and computed as integers (agorot = 1/100 of a shekel). This eliminates floating-point rounding errors. Use `formatAgorot()` from `shared/src/utils/currency.ts` for display.

**Credentials encrypted at rest** — Bank credentials are encrypted with AES-256-GCM before insertion and decrypted in-process only when a scrape runs. The raw key never leaves the server.

**Async sync** — Scrape requests return `{ queued: true }` immediately; the actual browser-based scrape runs in the background. Only one scraper instance runs at a time to respect browser resource limits.

**Deduplication** — Transactions are deduplicated on `(accountId, identifier)`. When the scraper provides no identifier, a SHA-256 hash of the transaction fields is used.

---

## Security Notes

- Never commit `.env` — it is in `.gitignore`
- The `ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes). Losing it means losing access to stored credentials
- Raw bank responses are never logged
- Credentials are only decrypted in-memory during an active scrape session

---

## Roadmap

- [x] Phase 1 — Core backend: auth, accounts, transactions, categories
- [x] Phase 2 — Scraper integration & auto-sync
- [x] Phase 3 — Web frontend (RTL Hebrew) + AI advisor
- [ ] Phase 4 — React Native (Expo) mobile app

---

## License

MIT
