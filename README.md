# Outflow — AI-Powered Personal Finance for Israeli Banks

> Automatic expense tracking for Israeli bank and credit card accounts. Outflow scrapes your accounts daily, categorizes every transaction with AI, tracks your budgets in real time, and delivers a personal financial advisor — all in one place.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Anthropic Claude](https://img.shields.io/badge/Claude-Haiku%20%2B%20Sonnet-D97757?style=flat-square&logo=anthropic&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-1.3-1C3C3C?style=flat-square&logo=langchain&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle%20ORM-4169E1?style=flat-square&logo=postgresql&logoColor=white)

---

## What is Outflow?

Outflow connects to your Israeli bank and credit card accounts, scrapes all transactions automatically (daily at 02:00 or on demand), and runs them through an AI pipeline that categorizes every charge — no manual entry required.

On top of that, a **Claude-powered financial advisor** analyses your spending history, compares it against your budgets, and tells you exactly where you can save, where you have room to spend more, and what to expect by end of month.

**The AI suggests. You decide.**

---

## AI & LLM Integration

All AI work runs through [LangChain](https://js.langchain.com/) with **Anthropic Claude** as the LLM backend. Two models are used, chosen by task complexity:

| Task | Model | Reason |
|------|-------|--------|
| Transaction categorization | Claude Haiku (`claude-haiku-4-5`) | High-volume, latency-sensitive, structured output |
| Financial advisor | Claude Sonnet (`claude-sonnet-4-6`) | Multi-step reasoning, nuanced Hebrew advice |

Both are wired through a single `llm.ts` factory (`getLlmFast` / `getLlmSmart`) so the model can be swapped via environment variable without touching any other code.

---

### AI Pipeline 1 — Transaction Categorization (auto, on every sync)

Every incoming transaction goes through a two-stage categorization pipeline:

```
Incoming transactions
    → Stage 1: User-defined keyword rules (contains / startsWith / keyword / regex)
        → matched → assign category immediately
        → unmatched → Stage 2: LLM batch call
            → Claude Haiku classifies in chunks of 50
                → Results merged back, stored in DB
```

The prompt sends Claude the full list of available categories (Hebrew names + icons) alongside a JSON array of unclassified transaction descriptions. Claude returns a JSON array of `{ index, categoryId }` pairs — no free-form text, no post-processing needed.

User-overridden categories are never touched by the LLM. If a user corrects a category manually, `categoryOverriddenByUser` is flagged and that transaction is excluded from all future re-categorization runs.

---

### AI Pipeline 2 — Financial Advisor (on demand, per month)

The advisor is a **LangGraph state machine** with three nodes that run sequentially. It pulls real spending data from the database, uses Claude to reason about it in two passes, and returns a fully structured advice object.

```
START
  │
  ▼
[Node 1 — gatherData]  (no LLM)
  Fetches 4 months of monthly totals, current-month category breakdown,
  and active budgets with real spent amounts from the database.
  │
  ▼
[Node 2 — analyzePatterns]  (Claude Sonnet)
  Identifies spending patterns, anomalies, income stability,
  average monthly figures, and savings rate across historical months.
  Returns: { patterns, anomalies, incomeStability, avgMonthlyExpensesILS,
             avgMonthlyIncomeILS, topSpendingCategories, savingsRate }
  │
  ▼
[Node 3 — generateAdvice]  (Claude Sonnet)
  Takes the pattern analysis + current-month category detail + active budgets
  + days remaining in month → produces the final advice payload.
  │
  ▼
END → AdvisorAdvice
```

The final advice payload the UI receives:

```typescript
{
  summary: string                     // Short paragraph on financial health
  riskLevel: 'low' | 'medium' | 'high'
  monthForecast: {
    expectedExpensesAgorot: number    // Projected spend by end of month
    note: string                      // Plain-language explanation
  }
  savingOpportunities: {
    categoryNameHe: string
    suggestion: string
    estimatedSavingAgorot: number
  }[]
  spendingPermissions: {              // Categories where there is budget headroom
    categoryNameHe: string
    suggestion: string
    estimatedBudgetAgorot: number
  }[]
  generalAdvice: string[]
  generatedAt: string                 // ISO timestamp
}
```

All prompts are written in Hebrew. All amounts flow through the pipeline in ILS (shekels) and are converted back to agorot integers before being stored or returned.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js 22+ + Express (TypeScript) |
| Database | PostgreSQL via Drizzle ORM |
| AI — LLM | Anthropic Claude (`@anthropic-ai/sdk` via `@langchain/anthropic`) |
| AI — Orchestration | LangChain LangGraph (`@langchain/langgraph`) |
| Bank Scraping | `@sergienko4/israeli-bank-scrapers` (Puppeteer-based) |
| Web Frontend | React 18 + Vite (RTL Hebrew UI) |
| Mobile | React Native / Expo (Phase 4) |
| Shared | Monorepo `@outflow/shared` — types, constants, `formatAgorot()` |

---

## Features

- **Automatic bank sync** — connects to Israeli banks and credit cards; scrapes daily at 02:00 or on demand
- **AI transaction categorization** — every charge is categorized automatically; user overrides are respected and never overwritten
- **Budget tracking** — set monthly budgets per category; visual green / amber / red thresholds updated in real time
- **Dashboard with month navigation** — income/expense hero cards + scroll-animated budget tiles; click any tile to see the full transaction list for that category and month
- **Floating AI Advisor** — per-month financial analysis accessible from any screen: spending summary, risk level, end-of-month forecast, saving opportunities, and actionable tips
- **Insights** — charts and category breakdowns across months
- **Account management** — add, manage, and sync multiple bank accounts from Settings; budget CRUD in the same place
- **Credential security** — bank credentials encrypted at rest with AES-256-GCM before hitting the database

---

## Web App

Single-page hub with bottom navigation:

| Route | Screen |
|-------|--------|
| `/` | Dashboard — income/expense hero tiles + scroll-animated budget tiles with month navigation |
| `/transactions` | Full paginated transaction list with category filter |
| `/insights` | Monthly charts and category breakdowns |
| `/settings` | Account management + budget CRUD |

The floating **AI Advisor** button (bottom-right) opens a slide-in panel without leaving the current screen. Select any of the last 4 months and run the analysis on demand.

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Auth — email + bcrypt password hash |
| `accounts` | Bank accounts with AES-256-GCM encrypted credentials |
| `transactions` | All scraped transactions; deduped on `(accountId, identifier)` |
| `categories` | System + user-defined categories with Hebrew names and emoji icons |
| `category_rules` | User-defined keyword/regex rules for deterministic categorization |
| `budgets` | Monthly budget targets per category per user |

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/auth/register` | Register |
| `POST` | `/api/auth/login` | Login → JWT |
| `GET` | `/api/accounts` | List bank accounts |
| `POST` | `/api/accounts` | Add account |
| `POST` | `/api/accounts/:id/sync` | Trigger async scrape |
| `GET` | `/api/transactions` | List transactions (filter by month, category) |
| `PATCH` | `/api/transactions/:id/category` | Override category |
| `GET` | `/api/categories` | List categories |
| `GET` | `/api/budgets` | List budgets with real spent amounts |
| `POST` | `/api/budgets` | Create budget |
| `PUT` | `/api/budgets/:id` | Update budget |
| `DELETE` | `/api/budgets/:id` | Delete budget |
| `GET` | `/api/insights/monthly` | Monthly income/expense totals |
| `GET` | `/api/insights/categories` | Category breakdown for a month |
| `GET` | `/api/ai/advisor` | Run AI advisor for a month |
| `POST` | `/api/ai/recategorize` | Re-run LLM categorization on all non-overridden transactions |

---

## Local Development

### Prerequisites

- Node.js >= 22.14.0
- PostgreSQL database
- [Anthropic API key](https://console.anthropic.com)

### Setup

```bash
git clone https://github.com/Tghez/Outflow.git
cd Outflow
npm install
```

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Run database migrations and seed default categories:

```bash
npm run db:migrate
npm run db:seed
```

### Development

```bash
npm run dev     # Backend on :3001
npm run web     # Vite web frontend
```

### Other commands

```bash
npm run scrape       # Manual scrape trigger
npm run db:studio    # Drizzle Studio visual DB browser
```

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/outflow

# Auth
JWT_SECRET=<random string>

# Encryption (bank credentials at rest)
ENCRYPTION_KEY=<64-char hex string — 32 bytes for AES-256>

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Optional model overrides
LLM_MODEL_FAST=claude-haiku-4-5-20251001
LLM_MODEL_SMART=claude-sonnet-4-6
```

---

## Project Structure

```
backend/
├── src/
│   ├── db/              — Drizzle schema, client, seed scripts
│   ├── lib/             — llm.ts, crypto.ts, jwt.ts, response helpers
│   ├── middleware/       — auth, validation, error handler
│   ├── prompts/          — LangChain prompt templates (Hebrew)
│   ├── routes/           — Express routers (auth, accounts, transactions,
│   │                        budgets, insights, ai)
│   └── services/         — scraper, sync, categorizer, llm-categorizer,
│                            advisor (LangGraph), scheduler
web/
├── src/
│   ├── api/              — Typed API client functions
│   ├── components/       — AIPanel, BudgetTile, layout, UI primitives
│   ├── screens/          — Dashboard, Transactions, Insights, Settings
│   └── store/            — Auth context
shared/
└── src/                  — Shared TypeScript types, formatAgorot(), constants
```

---

## Key Implementation Notes

- **Credentials** encrypted with AES-256-GCM before insert; the `ENCRYPTION_KEY` env var never touches the DB
- **Amounts** stored as integers in agorot (1 ILS = 100 agorot); all display goes through `formatAgorot()` in `@outflow/shared`
- **Scraper sign convention**: `chargedAmount` from the scraper is negative for expenses, positive for income
- **Deduplication** on `(accountId, identifier)`; SHA-256 hash of date + description + amount is used when the scraper returns no identifier
- **Sync is fire-and-forget** — `POST /sync` returns `{ queued: true }` immediately; scraping runs asynchronously and is kept sequential (one browser instance at a time due to Puppeteer memory constraints)
- **Categorization priority**: user keyword rules → LLM; user-overridden transactions are never re-categorized
- **Budget thresholds**: green < 80%, amber 80–100%, red ≥ 100%

---

## License

MIT
