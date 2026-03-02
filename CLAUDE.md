# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CryptoAnalyzer is a full-stack crypto/stock market analysis platform with composite buy/sell signal scoring. It combines technical indicators (RSI, MACD, Bollinger Bands, Moving Averages, Volume) with sentiment data (Fear & Greed Index) to produce a 0-100 composite signal score.

**Current state:** Pre-development. The PRD (`PRD.md`) defines the full specification across 5 implementation phases. No source code exists yet.

## Technology Stack

| Layer | Technology | Key Detail |
|-------|-----------|------------|
| Framework | Next.js 16.1 | App router; `proxy.ts` at root replaces middleware for auth redirects |
| Styling | Tailwind CSS v4.2 | CSS-native `@theme` directives (NOT `tailwind.config.js`) |
| Components | shadcn/ui | Unified `radix-ui` package, new-york style |
| Auth | Auth.js v5 | Unified `auth()` method, `@auth/drizzle-adapter` |
| ORM | Drizzle ORM | `postgres` driver, `drizzle-kit` for migrations |
| Database | Supabase PostgreSQL | Managed serverless, connection pooling |
| State | Zustand | Stores in `src/lib/store/` |
| Charts | TradingView Lightweight Charts + Recharts | Candlestick/OHLCV + dashboard charts |
| Indicators | trading-signals | RSI, MACD, BB, EMA, SMA |
| APIs | CoinGecko, Alpha Vantage, Finnhub, Alternative.me | Each has rate limits and caching TTLs defined in PRD Section 5 |

## Build & Development Commands

Once scaffolded, expected commands:
```bash
npm run dev              # Start development server
npm run build            # Production build
npm run lint             # ESLint
npx drizzle-kit push     # Push schema changes to database
npx drizzle-kit generate # Generate migration files
npx vitest               # Run unit tests
npx vitest run --reporter=verbose  # Single test run
npx playwright test      # Run E2E tests
```

## Architecture

### Planned Source Layout
```
src/
  app/
    (auth)/           # Login/register pages
    (dashboard)/      # Dashboard, asset detail, watchlist, portfolio, signals, settings
    api/              # Route handlers (crypto, stocks, signals, sentiment, portfolio, watchlist, alerts)
  components/
    ui/               # shadcn/ui primitives
    charts/           # TradingView + Recharts wrappers
    dashboard/        # Market overview, signal cards, widgets
    analysis/         # Indicator panels, composite score gauge
    portfolio/        # Holdings table, allocation chart
    layout/           # Sidebar, header, mobile nav
  lib/
    db/               # Drizzle client (index.ts) + schema (schema.ts)
    auth/             # Auth.js v5 config
    api/              # External API clients (coingecko.ts, alpha-vantage.ts, finnhub.ts, sentiment.ts)
    engine/           # Signal engine (indicators.ts, composite-score.ts, signal-generator.ts)
    store/            # Zustand stores (market-store.ts, signal-store.ts, ui-store.ts)
    utils/            # rate-limiter.ts, formatters.ts, cache.ts
  hooks/              # use-market-data.ts, use-signals.ts, use-websocket.ts
  types/              # market.ts, signals.ts, portfolio.ts
proxy.ts              # Root-level auth redirects (Next.js 16 pattern)
drizzle.config.ts     # Drizzle Kit configuration
```

### Composite Signal Engine

The core algorithm in `src/lib/engine/`:
- **indicators.ts** — Wraps `trading-signals` library; computes RSI(14), MACD(12,26,9), BB(20,2), MA crossover (50/200), Volume ratio
- **composite-score.ts** — Weighted scoring: RSI 0.20, MACD 0.25, BB 0.15, MA 0.25, Volume 0.15. Weights must sum to 1.0. Applies sentiment modifier (+/-5 pts). Clamps to 0-100
- **signal-generator.ts** — Orchestrates indicator computation + sentiment fetch, returns typed `CompositeSignal`

Signal thresholds: 0-20 STRONG SELL, 20-40 SELL, 40-60 HOLD, 60-80 BUY, 80-100 STRONG BUY.

### Key Patterns

- **Server Components by default** — Only add `"use client"` when hooks/interactivity are needed
- **Route handlers** export named functions: `GET`, `POST`, `PUT`, `DELETE`
- **Auth protection** in routes: `const session = await auth(); if (!session) return Response.json({...}, { status: 401 })`
- **`cn()` utility** for merging Tailwind classes (clsx + tailwind-merge)
- **UUIDs** for all primary keys via `crypto.randomUUID()`
- **Signal engine functions must be pure and deterministic** — no side effects, mock-friendly for testing

### API Rate Limits & Caching

| API | Rate Limit | Caching Strategy |
|-----|-----------|-----------------|
| CoinGecko | 30/min, 10k/month | 30-600s TTL depending on endpoint |
| Alpha Vantage | 25/day | 60-3600s TTL |
| Finnhub | 60/min + WebSocket | 15-300s TTL; live streaming for real-time |
| Alternative.me | No key needed | 300s TTL |

Rate limiting uses sliding window counters with request queueing and fallback to cached data at capacity.

## Implementation Phases

1. **Foundation** — Next.js scaffolding, auth, database, base layout
2. **Data Layer & Signal Engine** — API clients, indicators, composite scoring
3. **Dashboard & Charts** — TradingView charts, asset detail, signal display
4. **Watchlist & Portfolio** — User features, price alerts, signal persistence
5. **Advanced** — Backtesting, AI analysis (Claude API), custom indicator weights, PWA

## Team Agents

Six specialist agents are defined in `.claude/agents/`:
- **project-lead** (opus) — Task decomposition and coordination
- **backend-dev** (sonnet) — API routes, Drizzle, Supabase, Auth.js
- **frontend-dev** (sonnet) — Pages, components, shadcn/ui, charts, Zustand
- **signal-engineer** (sonnet) — Technical indicators, composite scoring
- **data-integrator** (sonnet) — External API clients, rate limiting, caching
- **test-engineer** (sonnet) — Vitest, React Testing Library, Playwright
- **code-reviewer** (sonnet) — Security, performance, accessibility review (read-only)

## Environment Variables

Required (see PRD Section 5 for full list):
```
AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET
DATABASE_URL, DIRECT_URL
COINGECKO_API_KEY, ALPHA_VANTAGE_API_KEY, FINNHUB_API_KEY
```
Phase 5 adds: `ANTHROPIC_API_KEY`

## Testing Strategy

- **Tier 1 (highest priority):** Signal engine — indicator calculations, composite scoring, weight normalization
- **Tier 2:** API clients — mock external APIs, test rate limiting and caching
- **Tier 3:** Components — render testing with React Testing Library
- **E2E:** Playwright for auth flows, dashboard navigation, signal display
- Test files: `*.test.ts` / `*.test.tsx`, colocated or in `__tests__/` directories
- Pattern: Arrange-Act-Assert; mock all external APIs
