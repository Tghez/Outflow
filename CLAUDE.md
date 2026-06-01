## Outflow — expense tracking app

## Stack
- Backend: Node.js + Express, PostgreSQL (pg / drizzle ORM)
- Scraper: @sergienko4/israeli-bank-scrapers (v8.x, requires Node >= 22.14.0)
- Web: React + Vite
- Mobile: React Native (Expo) — Phase 4

## Commands
- `npm run dev` — start backend on port 3001
- `npm run web` — start web frontend (Vite dev server)
- `npm run scrape` — manual scrape trigger
- `npm run db:migrate` — run drizzle-kit migrate
- `npm run db:seed` — seed default categories and rules
- `npm run db:studio` — open drizzle studio UI

## Architecture
- /backend — Express API + scraper service
- /web — React web app (RTL Hebrew)
- /mobile — Expo mobile app (Phase 4)
- /shared — shared types, constants, and utils

## Critical Rules
- Always encrypt bank credentials at rest (AES-256-GCM via backend/src/lib/crypto.ts)
- Never log credentials or raw bank responses
- Categories auto-assigned via keyword rules; always overridable by user
- All money amounts stored in agorot (integers). Display in ₪ via formatAgorot() in shared/src/utils/currency.ts
- chargedAmount from scraper is NEGATIVE for expenses, POSITIVE for income
- Dedup transactions on (accountId, identifier). Use SHA-256 hash when scraper provides no identifier
- Sync is fire-and-forget: HTTP returns { queued: true } immediately; scrape runs async
- Sequential syncs only — no parallel scraper instances (browser resource limits)

## Key Constants
- ENCRYPTION_KEY env var: 64-char hex string (= 32 bytes for AES-256)
- JWT expiry: 30 days
- Daily cron: '0 2 * * *' (02:00 local)
- Budget thresholds: green < 80%, amber 80–100%, red >= 100%

## Web Design System
Color palette (Tailwind `brand-*` tokens):
- `brand-bg` #FFFBF1 — page background
- `brand-surface` #FFF2D0 — card/tile background
- `brand-light` #FFB2B2 — soft coral accent, borders
- `brand-accent` #E36A6A — primary CTA, active states
- `brand-dark` #c45555 — hover on accent
- `brand-text` #2D1A1A — primary text
- `brand-muted` #8B6F6F — secondary/muted text

Web app structure (single-page hub):
- `/` Dashboard — hero income/expense tiles + all budget tiles (scroll-animated, expandable)
- `/transactions` — transaction list (unchanged)
- `/insights` — charts (unchanged)
- `/settings` — accounts + budget management (הוסף תקציב לקטגוריה lives here)
- AI advisor is a floating panel (AIPanel component), not a separate route
- Budget viewing is on Dashboard; budget CRUD is in Settings
