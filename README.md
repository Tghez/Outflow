# Outflow — Personal Finance Tracker

Israeli bank expense tracker with automatic scraping, budget tracking, and AI-powered financial advice.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js + Express, PostgreSQL (Drizzle ORM) |
| Scraper | `@sergienko4/israeli-bank-scrapers` (requires Node >= 22.14.0) |
| Web | React + Vite (RTL Hebrew UI) |
| Mobile | React Native / Expo (Phase 4) |

## Getting Started

### Prerequisites
- Node >= 22.14.0
- PostgreSQL database
- `.env` with `DATABASE_URL`, `ENCRYPTION_KEY` (64-char hex), `JWT_SECRET`

### Setup

```bash
npm install
npm run db:migrate   # create schema
npm run db:seed      # seed default categories & keyword rules
```

### Development

```bash
npm run dev     # backend on :3001
npm run web     # Vite web frontend
```

### Other commands

```bash
npm run scrape       # manual scrape trigger
npm run db:studio    # Drizzle Studio UI
```

## Project Structure

```
/backend    Express API + scraper service
/web        React web app
/mobile     Expo mobile app (Phase 4)
/shared     Shared types, constants, utils
```

## Web App

Single-page hub with bottom navigation:

| Route | Screen |
|-------|--------|
| `/` | Dashboard — income/expense hero + scroll-animated budget tiles (month navigation) |
| `/transactions` | Full transaction list |
| `/insights` | Charts & category breakdowns |
| `/settings` | Account management + budget CRUD |

A floating **AI Advisor** panel (bottom-right button) provides per-month spending analysis, saving opportunities, and forecasts without leaving the current screen.

Clicking a budget tile opens an inline modal with the full transaction list for that category.

## Design System

Tailwind `brand-*` color tokens:

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-bg` | `#FFFBF1` | Page background |
| `brand-surface` | `#FFF2D0` | Card / tile background |
| `brand-light` | `#FFB2B2` | Soft coral accent, borders |
| `brand-accent` | `#E36A6A` | Primary CTA, active states |
| `brand-dark` | `#c45555` | Hover on accent |
| `brand-text` | `#2D1A1A` | Primary text |
| `brand-muted` | `#8B6F6F` | Secondary / muted text |

## Key Implementation Notes

- **Credentials** encrypted at rest with AES-256-GCM (`backend/src/lib/crypto.ts`)
- **Amounts** stored as integers in agorot; displayed via `formatAgorot()` in `shared/src/utils/currency.ts`
- **Scraper sign**: `chargedAmount` is negative for expenses, positive for income
- **Dedup** on `(accountId, identifier)`; SHA-256 hash used when the scraper provides no identifier
- **Sync** is fire-and-forget — the HTTP endpoint returns `{ queued: true }` immediately; scraping runs async and sequential (no parallel browser instances)
- **Budget thresholds**: green < 80%, amber 80-100%, red >= 100%
- Daily cron runs at 02:00 local time
