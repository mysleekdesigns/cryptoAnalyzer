# CryptoAnalyzer - Product Requirements Document

## Overview

CryptoAnalyzer is a full-stack web application that provides real-time crypto and stock market analysis with composite buy/sell signal scoring. The app combines multiple technical indicators (RSI, MACD, Bollinger Bands, Moving Averages, Volume) with market sentiment data (Fear & Greed Index) to generate actionable trading signals with a composite score from 0-100.

**Target User:** Individual traders and investors who want data-driven buy/sell recommendations for crypto and stocks.

**Disclaimer:** This tool is for informational and educational purposes only. It does not constitute financial advice. Trading involves significant risk of loss. Always do your own research before making investment decisions.

---

## Technology Stack (Latest Versions - March 2026)

| Layer | Technology | Version / Notes |
|---|---|---|
| Framework | **Next.js** | 16.1 (app router, `proxy.ts` replaces middleware) |
| Styling | **Tailwind CSS** | v4.2 (CSS-native `@theme` directives, 5x faster builds) |
| Components | **shadcn/ui** | Feb 2026 (unified `radix-ui` package, new-york style) |
| Auth | **Auth.js** | v5 (unified `auth()` method, email/password + OAuth) |
| ORM | **Drizzle ORM** | Latest with `postgres` driver |
| Database | **Supabase PostgreSQL** | Managed serverless Postgres |
| State Management | **Zustand** | ~3KB, Redux devtools compatible |
| Financial Charts | **TradingView Lightweight Charts** | ~45KB, candlestick/OHLCV rendering |
| Dashboard Charts | **Recharts** (via shadcn) | Pie, bar, area charts for portfolio/dashboard |
| Technical Indicators | **trading-signals** | TypeScript library for RSI, MACD, BB, EMA, SMA |
| Crypto Data | **CoinGecko API** | Free tier: 30 calls/min, 10k/month |
| Stock Data | **Alpha Vantage + Finnhub** | Free tiers; Finnhub has WebSocket for real-time |
| Sentiment Data | **Alternative.me** | Fear & Greed Index, free, no API key required |
| Deployment | **Vercel** | Auto-deploy from GitHub, free tier |

---

## Core Feature: Composite Signal Algorithm

### How It Works

The app calculates a **Composite Signal Score (0-100)** for each asset by combining five technical indicators with market sentiment data. Each indicator produces a sub-score (0 = strong sell, 50 = neutral, 100 = strong buy), then they are combined using weighted averages.

### Indicator Weights (Default)

| Indicator | Weight | Buy Condition | Sell Condition |
|---|---|---|---|
| **RSI** (14-period) | 0.20 | RSI < 30 (oversold) | RSI > 70 (overbought) |
| **MACD** | 0.25 | Bullish crossover (MACD crosses above signal line) | Bearish crossover |
| **Bollinger Bands** | 0.15 | Price at lower band + RSI < 40 | Price at upper band + RSI > 60 |
| **Moving Averages** | 0.25 | Golden cross (50d SMA > 200d SMA) | Death cross (50d < 200d) |
| **Volume** | 0.15 | Volume > 1.5x 20-day avg on up move | Volume > 1.5x avg on down move |

### Sentiment Modifier (Fear & Greed Index)

The Fear & Greed Index applies a contrarian modifier to the composite score:

| Fear & Greed Range | Modifier | Rationale |
|---|---|---|
| 0-25 (Extreme Fear) | +5 pts | Markets oversold, contrarian buy |
| 25-45 (Fear) | +2 pts | Slight buy bias |
| 45-55 (Neutral) | 0 | No adjustment |
| 55-75 (Greed) | -2 pts | Slight sell bias |
| 75-100 (Extreme Greed) | -5 pts | Markets overheated, contrarian sell |

### Signal Thresholds

| Composite Score | Signal | Display Color |
|---|---|---|
| 0-20 | **STRONG SELL** | Red |
| 20-40 | **SELL** | Orange-red |
| 40-60 | **HOLD** | Yellow / Gray |
| 60-80 | **BUY** | Green |
| 80-100 | **STRONG BUY** | Bright green |

### Cross-Confirmation

When both MACD and RSI indicators agree on direction (both signaling buy or both signaling sell), the signal receives a **"Confirmed"** badge. Research shows cross-confirmed MACD + RSI signals achieve a **73-77% historical win rate**.

---

## Project Structure

```
src/
  app/
    (auth)/
      login/page.tsx                    # Email/password + OAuth login
      register/page.tsx                 # Email/password signup
    (dashboard)/
      layout.tsx                        # Dashboard layout with sidebar
      page.tsx                          # Main dashboard
      assets/[type]/[symbol]/page.tsx   # Asset detail (/assets/crypto/BTC)
      watchlist/page.tsx                # User watchlist
      portfolio/page.tsx                # Portfolio tracker
      signals/page.tsx                  # Signal history & overview
      settings/page.tsx                 # User preferences
    api/
      auth/[...nextauth]/route.ts       # Auth.js API routes
      crypto/route.ts                   # Crypto market data
      crypto/[id]/route.ts              # Individual crypto detail
      stocks/route.ts                   # Stock market data
      stocks/[symbol]/route.ts          # Individual stock detail
      signals/[type]/[symbol]/route.ts  # On-demand signal calculation
      sentiment/route.ts                # Fear & Greed Index
      portfolio/                        # Portfolio CRUD routes
      watchlist/                        # Watchlist CRUD routes
      alerts/                           # Price alert routes
    layout.tsx                          # Root layout
    page.tsx                            # Landing / marketing page
  components/
    ui/                                 # shadcn/ui components
    charts/
      candlestick-chart.tsx             # TradingView Lightweight Charts wrapper
      price-chart.tsx                   # Line chart for simple views
      volume-chart.tsx                  # Volume histogram
      indicator-overlay.tsx             # SMA/EMA/BB overlays, RSI/MACD sub-charts
    dashboard/
      market-overview.tsx               # Top assets grid with sparklines
      signal-card.tsx                   # Compact signal display card
      fear-greed-widget.tsx             # Semicircular gauge widget
      top-movers.tsx                    # Top gainers/losers
      watchlist-widget.tsx              # Compact watchlist preview
    analysis/
      indicator-panel.tsx               # Individual indicator breakdowns
      composite-score.tsx               # Large circular score gauge
      signal-history.tsx                # Historical signal timeline
    portfolio/
      holdings-table.tsx                # Sortable holdings data table
      allocation-chart.tsx              # Portfolio allocation pie chart
      performance-chart.tsx             # Portfolio value over time
    layout/
      sidebar.tsx                       # Collapsible sidebar navigation
      header.tsx                        # Search bar, avatar, theme toggle
      mobile-nav.tsx                    # Bottom tab bar for mobile
  lib/
    db/
      index.ts                          # Drizzle + Supabase client
      schema.ts                         # All table schemas
    auth/
      index.ts                          # Auth.js v5 config
    api/
      coingecko.ts                      # CoinGecko API client
      alpha-vantage.ts                  # Alpha Vantage API client
      finnhub.ts                        # Finnhub REST + WebSocket client
      sentiment.ts                      # Alternative.me Fear & Greed client
    engine/
      indicators.ts                     # trading-signals wrapper (RSI, MACD, BB, MA, Vol)
      composite-score.ts                # Weighted signal scoring algorithm
      signal-generator.ts               # Orchestrates indicators + sentiment
      backtester.ts                     # Historical backtesting (Phase 5)
    store/
      market-store.ts                   # Zustand: prices, selected asset
      signal-store.ts                   # Zustand: current signals, filters
      ui-store.ts                       # Zustand: sidebar, theme
    utils/
      rate-limiter.ts                   # Per-API rate limit tracking
      formatters.ts                     # Currency, %, numbers, dates
      cache.ts                          # Server-side caching helpers
  hooks/
    use-market-data.ts                  # Market data fetching hook
    use-signals.ts                      # Signal calculation hook
    use-websocket.ts                    # Finnhub WebSocket hook
  types/
    market.ts                           # Asset, OHLCV, Ticker types
    signals.ts                          # Signal, Indicator, CompositeScore types
    portfolio.ts                        # Holding, Transaction types
proxy.ts                               # Next.js 16 auth redirects
drizzle.config.ts                       # Drizzle configuration
```

---

## Database Schema

### Auth Tables (managed by Auth.js v5 + Drizzle adapter)
- **users** - id, name, email, emailVerified, image, password (hashed)
- **accounts** - OAuth provider accounts linked to users
- **sessions** - Active user sessions
- **verification_tokens** - Email verification tokens

### Application Tables

**watchlist_items**
| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Unique identifier |
| userId | text (FK) | References users.id |
| symbol | text | Asset symbol (BTC, AAPL) |
| assetType | text | "crypto" or "stock" |
| addedAt | timestamp | When added |

**portfolio_holdings**
| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Unique identifier |
| userId | text (FK) | References users.id |
| symbol | text | Asset symbol |
| assetType | text | "crypto" or "stock" |
| quantity | decimal | Amount held |
| avgBuyPrice | decimal | Average purchase price |
| notes | text | Optional notes |
| createdAt | timestamp | Created date |
| updatedAt | timestamp | Last updated |

**portfolio_transactions**
| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Unique identifier |
| holdingId | uuid (FK) | References portfolio_holdings.id |
| type | text | "buy" or "sell" |
| quantity | decimal | Transaction amount |
| price | decimal | Price per unit |
| fee | decimal | Transaction fee |
| executedAt | timestamp | When trade was executed |
| createdAt | timestamp | Record created |

**signal_history**
| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Unique identifier |
| userId | text (FK) | References users.id |
| symbol | text | Asset symbol |
| assetType | text | "crypto" or "stock" |
| signalType | text | "strong_buy", "buy", "hold", "sell", "strong_sell" |
| compositeScore | integer | 0-100 |
| indicators | jsonb | Individual indicator values and scores |
| sentiment | jsonb | Fear & Greed data at time of signal |
| createdAt | timestamp | When signal was generated |

**price_alerts**
| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Unique identifier |
| userId | text (FK) | References users.id |
| symbol | text | Asset symbol |
| assetType | text | "crypto" or "stock" |
| condition | text | "above" or "below" |
| targetPrice | decimal | Alert trigger price |
| isActive | boolean | Whether alert is active |
| triggeredAt | timestamp | When alert fired (null if not yet) |
| createdAt | timestamp | Created date |

**user_preferences**
| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Unique identifier |
| userId | text (FK) | References users.id |
| indicatorWeights | jsonb | Custom weights for composite score |
| defaultAssetType | text | Default view: "crypto" or "stock" |
| theme | text | "light" or "dark" |
| updatedAt | timestamp | Last updated |

---

## API Integration & Caching Strategy

### CoinGecko (30 calls/min, 10k/month)

| Endpoint | Purpose | Cache TTL |
|---|---|---|
| `/coins/markets` | Market overview, top coins | 60s |
| `/coins/{id}/market_chart` | OHLCV for charts + indicators | 300s |
| `/coins/{id}` | Asset detail page | 120s |
| `/simple/price` | Watchlist price updates | 30s |
| `/search/trending` | Trending coins | 600s |

### Alpha Vantage (25 calls/day)

| Endpoint | Purpose | Cache TTL |
|---|---|---|
| `TIME_SERIES_DAILY` | Daily OHLCV for stocks | 300s |
| `TIME_SERIES_INTRADAY` | Intraday data | 60s |
| `OVERVIEW` | Company fundamentals | 3600s |

### Finnhub (60 calls/min)

| Endpoint | Purpose | Cache TTL |
|---|---|---|
| REST `/quote` | Current stock price | 15s |
| WebSocket | Real-time price streaming | N/A (live) |
| `/stock/candle` | OHLCV candles | 300s |

### Rate Limiting Strategy
- Sliding window counter per API per minute/day
- Queue requests that would exceed limits
- Log warnings at 80% capacity
- Fallback to cached data when rate limited

---

## Implementation Phases

---

### Phase 1: Foundation

**Goal:** Scaffold the Next.js 16.1 app with auth, database, base layout, and navigation.

- [x] **1.1 Project Initialization**
  - [x] Initialize Next.js 16.1 project with TypeScript, Tailwind CSS v4.2, ESLint, app router, src directory
  - [x] Verify Tailwind v4.2 is installed; set up CSS-native `@theme` directives in globals.css
  - [x] Define custom color tokens for signal colors (strong-buy green, buy green, hold yellow, sell orange, strong-sell red) and dark mode palette
  - [x] Install and initialize shadcn/ui with `new-york` style (unified `radix-ui` package)
  - [x] Add base shadcn components: Button, Card, Dialog, DropdownMenu, Input, Tabs, Badge, Tooltip, Separator, Skeleton, Toast, Avatar, Sheet

- [x] **1.2 Authentication (Auth.js v5)**
  - [x] Install `next-auth@5` and `@auth/drizzle-adapter`
  - [x] Create `src/lib/auth/index.ts` exporting `auth`, `signIn`, `signOut`, `handlers`
  - [x] Configure **Email/Password** credentials provider (with bcrypt password hashing)
  - [x] Configure **Google OAuth** provider (env: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)
  - [x] Configure **GitHub OAuth** provider (env: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`)
  - [x] Set `AUTH_SECRET` environment variable
  - [x] Create `src/app/api/auth/[...nextauth]/route.ts`
  - [x] Create `proxy.ts` at project root for auth session checks and route protection
  - [x] Build login page at `src/app/(auth)/login/page.tsx` with email/password form + Google/GitHub buttons
  - [x] Build register page at `src/app/(auth)/register/page.tsx` with email/password signup form
  - [x] Add `SessionProvider` wrapper in root layout

- [x] **1.3 Database (Drizzle ORM + Supabase)**
  - [x] Install `drizzle-orm`, `postgres`, `drizzle-kit`
  - [ ] Create Supabase project and get connection strings
  - [x] Create `src/lib/db/index.ts` with Supabase PostgreSQL connection
  - [x] Create `src/lib/db/schema.ts` with all tables (auth tables + watchlist_items, portfolio_holdings, portfolio_transactions, signal_history, price_alerts, user_preferences)
  - [x] Create `drizzle.config.ts`
  - [x] Generate and push initial migration
  - [x] Wire Drizzle adapter into Auth.js config

- [x] **1.4 Base Layout & Navigation**
  - [x] Create root layout with dark-mode-first theme, font loading, global metadata
  - [x] Create dashboard layout with sidebar + header
  - [x] Build collapsible sidebar with nav links: Dashboard, Assets, Signals, Watchlist, Portfolio, Settings
  - [x] Build header with search bar, user avatar dropdown (sign out), theme toggle
  - [x] Build mobile bottom tab navigation
  - [x] Create placeholder pages for all dashboard routes
  - [x] Set up Zustand `ui-store` for sidebar collapsed state and theme preference

- [x] **1.5 Configuration & Documentation**
  - [x] Create `.env.local` template with all required variables
  - [x] Update `.gitignore` for Next.js project (node_modules, .next, .env.local, drizzle/meta)
  - [ ] Verify `npm run dev` works with auth flow end-to-end

---

### Phase 2: Data Layer & Signal Engine

**Goal:** Build API client services, the technical indicator calculation engine, and the composite buy/sell signal algorithm.

- [x] **2.1 API Client Services**
  - [x] Create `src/lib/api/coingecko.ts` - typed client for markets, coin detail, market chart, simple price, trending
  - [x] Create `src/lib/api/alpha-vantage.ts` - typed client for daily/intraday time series, company overview
  - [x] Create `src/lib/api/finnhub.ts` - typed REST client for quote/candle + WebSocket connection manager for real-time prices
  - [x] Create `src/lib/api/sentiment.ts` - Alternative.me Fear & Greed Index client
  - [x] Create `src/lib/utils/rate-limiter.ts` - per-API call counting with sliding window, overflow queue

- [x] **2.2 Type Definitions**
  - [x] Define `src/types/market.ts` - Asset, OHLCV, Ticker, MarketData, AssetType
  - [x] Define `src/types/signals.ts` - Signal, SignalType, IndicatorResult, CompositeScore, IndicatorWeights
  - [x] Define `src/types/portfolio.ts` - Holding, Transaction, PortfolioSummary

- [x] **2.3 Server-Side Caching & API Routes**
  - [x] Create `src/lib/utils/cache.ts` - wrapper around Next.js caching with revalidation tags
  - [x] Implement per-endpoint cache TTLs (see caching table above)
  - [x] Create API routes:
    - [x] `api/crypto/route.ts` - market list + trending
    - [x] `api/crypto/[id]/route.ts` - detail + chart data
    - [x] `api/stocks/route.ts` - market overview
    - [x] `api/stocks/[symbol]/route.ts` - detail + chart data
    - [x] `api/sentiment/route.ts` - Fear & Greed Index
    - [x] `api/signals/[type]/[symbol]/route.ts` - on-demand signal calculation

- [x] **2.4 Technical Indicator Engine**
  - [x] Install `trading-signals` npm package
  - [x] Create `src/lib/engine/indicators.ts`:
    - [x] `calculateRSI(prices, period?)` - RSI class, maps RSI value to 0-100 score
    - [x] `calculateMACD(prices)` - MACD class, detects crossover, returns score
    - [x] `calculateBollingerBands(prices, period?)` - evaluates price position relative to bands
    - [x] `calculateMovingAverages(prices)` - 50d/200d SMA, detects golden/death cross
    - [x] `calculateVolumeSignal(volumes, prices)` - compares to 20-day average, correlates with direction

- [x] **2.5 Composite Signal Algorithm**
  - [x] Create `src/lib/engine/composite-score.ts`:
    - [x] Weighted score calculation with configurable weights
    - [x] Sentiment modifier application (+/- 5 pts)
    - [x] Score clamping (0-100) and signal type determination
    - [x] Cross-confirmation detection (MACD + RSI agreement)
  - [x] Create `src/lib/engine/signal-generator.ts`:
    - [x] `generateSignal(ohlcv, volumes, sentimentIndex, weights?)` - orchestrates all calculations
    - [x] Returns full Signal object with individual indicator breakdowns

- [x] **2.6 Client State & Hooks**
  - [x] Create `src/lib/store/market-store.ts` (Zustand) - selectedAsset, marketData, isLoading
  - [x] Create `src/lib/store/signal-store.ts` (Zustand) - currentSignals, signalHistory, filters
  - [x] Create `src/hooks/use-market-data.ts` - fetches from API routes with polling
  - [x] Create `src/hooks/use-signals.ts` - triggers signal calculation, manages loading
  - [x] Create `src/hooks/use-websocket.ts` - Finnhub WebSocket for real-time stock prices

---

### Phase 3: Dashboard & Charts

**Goal:** Build the main dashboard, TradingView chart integration, asset detail pages, and signal display.

- [ ] **3.1 TradingView Lightweight Charts**
  - [ ] Install `lightweight-charts` npm package
  - [ ] Create `src/components/charts/candlestick-chart.tsx`:
    - [ ] Initialize `createChart()` with dark theme
    - [ ] Accept OHLCV data as prop, render candlestick series
    - [ ] Time range selector (1D, 1W, 1M, 3M, 1Y, ALL)
    - [ ] Auto-resize on container resize
    - [ ] Crosshair tooltip with OHLCV values
  - [ ] Create `src/components/charts/price-chart.tsx` - line chart variant
  - [ ] Create `src/components/charts/volume-chart.tsx` - histogram below candlestick
  - [ ] Create `src/components/charts/indicator-overlay.tsx`:
    - [ ] SMA/EMA lines on candlestick chart
    - [ ] Bollinger Bands as shaded area
    - [ ] Toggle visibility per indicator
    - [ ] Sub-chart panes for RSI and MACD

- [ ] **3.2 Main Dashboard Page**
  - [ ] Build `src/app/(dashboard)/page.tsx` as Server Component
  - [ ] Create `src/components/dashboard/market-overview.tsx` - top 20 assets grid with price, 24h change, mini sparkline, crypto/stocks tabs
  - [ ] Create `src/components/dashboard/top-movers.tsx` - top gainers/losers cards
  - [ ] Create `src/components/dashboard/signal-card.tsx` - compact signal with score, badge, cross-confirmation indicator
  - [ ] Create `src/components/dashboard/fear-greed-widget.tsx` - semicircular gauge (0-100), color gradient, historical mini-chart
  - [ ] Create `src/components/dashboard/watchlist-widget.tsx` - compact user watchlist with prices and signals
  - [ ] Assemble responsive grid layout (2-3 columns desktop, 1 column mobile)

- [ ] **3.3 Asset Detail Page**
  - [ ] Build `src/app/(dashboard)/assets/[type]/[symbol]/page.tsx` - Server Component with signal generation
  - [ ] Full-width candlestick chart with indicator overlays and time range selector
  - [ ] Create `src/components/analysis/indicator-panel.tsx` - individual indicator scores with visual breakdowns
  - [ ] Create `src/components/analysis/composite-score.tsx` - large circular gauge, signal label, cross-confirmation badge, weight breakdown
  - [ ] "Add to Watchlist" and "Add to Portfolio" action buttons

- [ ] **3.4 Signals Overview Page**
  - [ ] Build `src/app/(dashboard)/signals/page.tsx` - table of recent signals
  - [ ] Filter by signal type, asset type, date range
  - [ ] Sort by composite score, date, asset name
  - [ ] Create `src/components/analysis/signal-history.tsx` - timeline with buy/sell markers on price chart

- [ ] **3.5 Utility Formatters**
  - [ ] Create `src/lib/utils/formatters.ts`:
    - [ ] `formatCurrency(value, currency)` - locale-aware
    - [ ] `formatPercent(value)` - with +/- sign, red/green color
    - [ ] `formatLargeNumber(value)` - abbreviate K/M/B
    - [ ] `formatDate(date, format)` - relative and absolute
    - [ ] `formatSignalScore(score)` - returns label and color class

---

### Phase 4: Watchlist & Portfolio

**Goal:** Implement user watchlists, portfolio tracking, price alerts, and signal persistence.

- [ ] **4.1 Watchlist Feature**
  - [ ] Create API routes: GET/POST/DELETE `/api/watchlist`
  - [ ] Build `src/app/(dashboard)/watchlist/page.tsx` - full table with asset name, price, 24h change, signal badge, actions
  - [ ] Inline search + add component
  - [ ] Bulk signal analysis button (run composite score for all watched assets)

- [ ] **4.2 Portfolio Tracking**
  - [ ] Create API routes: CRUD for `/api/portfolio/holdings` and `/api/portfolio/transactions`
  - [ ] Build `src/app/(dashboard)/portfolio/page.tsx`:
    - [ ] Portfolio summary: total value, total gain/loss ($, %), day change
    - [ ] Holdings table: asset, quantity, avg price, current price, value, gain/loss, signal
  - [ ] Create `src/components/portfolio/holdings-table.tsx` - sortable data table
  - [ ] Create `src/components/portfolio/allocation-chart.tsx` - Recharts pie/donut chart
  - [ ] Create `src/components/portfolio/performance-chart.tsx` - Recharts area chart (portfolio value over time)
  - [ ] "Record Transaction" dialog for manual buy/sell entry

- [ ] **4.3 Price Alerts**
  - [ ] Create API routes: CRUD for `/api/alerts`
  - [ ] Alert creation dialog: select asset, condition (above/below), target price
  - [ ] Server-side alert checking (periodic via Vercel cron or polling)
  - [ ] Mark triggered alerts, store `triggeredAt` timestamp
  - [ ] Toast notifications for triggered alerts (via Zustand + shadcn Toast)
  - [ ] Alerts management in Settings page

- [ ] **4.4 Signal History Persistence**
  - [ ] Write generated signals to `signal_history` table
  - [ ] API route: GET `/api/signals/history` - paginated with filters
  - [ ] Display on asset detail page and signals overview page

---

### Phase 5: Advanced Features

**Goal:** Backtesting, AI analysis, custom indicator weights, PWA, and performance polish.

- [ ] **5.1 Backtesting Engine**
  - [ ] Create `src/lib/engine/backtester.ts`:
    - [ ] Iterate historical data, generate signals at each point
    - [ ] Simulate trades: buy on BUY/STRONG_BUY, sell on SELL/STRONG_SELL
    - [ ] Calculate: total trades, win rate, avg gain/loss, max drawdown, Sharpe ratio
  - [ ] Create API route: POST `/api/backtest` (symbol, date range, optional custom weights)
  - [ ] Build backtest results UI:
    - [ ] Performance chart with buy/sell markers overlaid on price
    - [ ] Stats summary: win rate, profit factor, total return, max drawdown
    - [ ] Compare default vs custom weights

- [ ] **5.2 AI Analysis Summaries (Claude API)**
  - [ ] Install `@anthropic-ai/sdk`
  - [ ] Create API route: POST `/api/analysis/summary`
    - [ ] Input: symbol, indicator values, sentiment, recent price action
    - [ ] Prompt Claude for 2-3 paragraph analysis (technical setup, key levels, risk factors)
    - [ ] Cache response for 30 minutes per asset
  - [ ] Display AI summary card on asset detail page
  - [ ] Rate limit: max 10 summaries per user per hour

- [ ] **5.3 Custom Indicator Configuration**
  - [ ] Settings page section with slider for each indicator weight (must sum to 1.0)
  - [ ] Preset configurations: "Conservative", "Aggressive", "Momentum", "Mean Reversion"
  - [ ] Save to `user_preferences.indicatorWeights` in DB
  - [ ] Pass custom weights through signal pipeline
  - [ ] Show "Custom" badge on signals when non-default weights active

- [ ] **5.4 PWA & Mobile Optimization**
  - [ ] Add `manifest.json` for PWA (name, icons, theme color, display: standalone)
  - [ ] Service worker for offline caching of static assets
  - [ ] Responsive at all breakpoints (320px, 375px, 768px, 1024px, 1440px)
  - [ ] Bottom tab navigation on mobile replaces sidebar
  - [ ] Touch-optimized chart interactions (pinch zoom, swipe time range)

- [ ] **5.5 Performance & Polish**
  - [ ] Loading skeletons for all data-fetching components (shadcn Skeleton)
  - [ ] Error boundaries with retry buttons
  - [ ] Bundle optimization: dynamic imports for chart components, lazy load below-fold content
  - [ ] `<Suspense>` boundaries around async Server Components
  - [ ] Lighthouse audit targeting 90+ Performance, Accessibility, Best Practices

---

## Environment Variables

```env
# Auth.js v5
AUTH_SECRET=                     # Generate with: npx auth secret
AUTH_GOOGLE_ID=                  # Google Cloud Console > APIs & Services > Credentials
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=                  # GitHub > Settings > Developer settings > OAuth Apps
AUTH_GITHUB_SECRET=

# Database (Supabase)
DATABASE_URL=                    # Supabase Dashboard > Settings > Database > Connection string > URI
DIRECT_URL=                      # Supabase direct connection (for migrations)

# Market Data APIs
COINGECKO_API_KEY=               # https://www.coingecko.com/en/api/pricing (Demo plan)
ALPHA_VANTAGE_API_KEY=           # https://www.alphavantage.co/support/#api-key (Free)
FINNHUB_API_KEY=                 # https://finnhub.io/register (Free)

# AI Analysis (Phase 5)
ANTHROPIC_API_KEY=               # https://console.anthropic.com/

# Optional Premium Data
POLYGON_API_KEY=                 # https://polygon.io/ (Optional, for WebSocket streaming)
```

## API Signup Links

| Service | Signup URL | Free Tier Details |
|---|---|---|
| **Supabase** | https://supabase.com/dashboard | 500MB DB, 50k monthly active users, 2 projects |
| **Google OAuth** | https://console.cloud.google.com/apis/credentials | Free, create OAuth 2.0 Client ID |
| **GitHub OAuth** | https://github.com/settings/developers | Free, create OAuth App |
| **CoinGecko** | https://www.coingecko.com/en/api/pricing | Demo: 30 calls/min, 10k calls/month |
| **Alpha Vantage** | https://www.alphavantage.co/support/#api-key | 25 calls/day, 5 calls/min |
| **Finnhub** | https://finnhub.io/register | 60 calls/min, WebSocket real-time |
| **Alternative.me** | https://alternative.me/crypto/fear-and-greed-index/#api | Free, no API key required |
| **Vercel** | https://vercel.com/signup | Free tier for hobby projects |
| **Anthropic** | https://console.anthropic.com/ | Pay-per-use, needed only for Phase 5 |

---

## Deployment

- **Platform:** Vercel (auto-deploy from GitHub main branch)
- **Database:** Supabase PostgreSQL (managed, free tier)
- **Runtime:** Node.js (Next.js 16 app router, no Edge Functions needed)
- **CI/CD:** GitHub push to main triggers Vercel deployment

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| CoinGecko rate limit (30/min) | Stale crypto data | Aggressive caching (60-600s TTLs), rate limiter with queue, batch requests |
| Alpha Vantage limit (25/day) | Very limited stock data | Cache 300-3600s, prioritize user-requested assets, preload watchlist |
| Indicator false signals | Poor user trust | Cross-confirmation badges, confidence level display, mandatory disclaimer |
| Supabase cold starts | Slow first query | Connection pooling, keep-alive via periodic health check |
| Chart performance (large datasets) | Janky UI | Limit to 500 visible candles, paginate historical data |

---

## Success Metrics

- Signal accuracy: Track % of signals that predict correct direction within 24h/7d
- User engagement: Watchlist items added, signals viewed per session
- Performance: < 2s initial load, < 500ms for signal calculation
- Lighthouse: 90+ across all categories
