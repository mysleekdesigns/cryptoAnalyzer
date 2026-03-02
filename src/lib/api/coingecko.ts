import { cache, CACHE_TTL } from '@/lib/utils/cache';
import {
  coinGeckoLimiter,
  coinGeckoMonthlyLimiter,
} from '@/lib/utils/rate-limiter';
import type {
  CoinGeckoMarketResponse,
  CoinGeckoChartResponse,
  CachedResponse,
} from '@/types/market';

const BASE_URL = 'https://api.coingecko.com/api/v3';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { Accept: 'application/json' };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }
  return headers;
}

async function rateLimitedFetch<T>(
  url: string,
  cacheKey: string,
  ttlSeconds: number
): Promise<CachedResponse<T>> {
  // Check cache first
  const cached = cache.get<T>(cacheKey);
  if (cached !== null) {
    return { data: cached, cachedAt: Date.now(), isStale: false };
  }

  // Check both per-minute and monthly rate limits
  const [minuteResult, monthlyResult] = await Promise.all([
    coinGeckoLimiter.acquire(),
    coinGeckoMonthlyLimiter.acquire(),
  ]);

  if (minuteResult.useCached || monthlyResult.useCached) {
    // Rate limited — try to return stale cache entry if available
    const stale = cache.get<T>(cacheKey);
    if (stale !== null) {
      return { data: stale, cachedAt: Date.now(), isStale: true };
    }
    throw new Error(
      `[CoinGecko] Rate limited and no cached data available for ${cacheKey}`
    );
  }

  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
    throw new Error(
      `[CoinGecko] HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data: T = await response.json();
  cache.set(cacheKey, data, ttlSeconds);
  return { data, cachedAt: Date.now(), isStale: false };
}

// GET /coins/markets — list of coins with market data
export async function getMarkets(
  vsCurrency = 'usd',
  page = 1,
  perPage = 50,
  sparkline = false
): Promise<CachedResponse<CoinGeckoMarketResponse[]>> {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    order: 'market_cap_desc',
    per_page: String(perPage),
    page: String(page),
    sparkline: String(sparkline),
  });
  const cacheKey = `coingecko:markets:${vsCurrency}:${page}:${perPage}`;
  return rateLimitedFetch<CoinGeckoMarketResponse[]>(
    `${BASE_URL}/coins/markets?${params}`,
    cacheKey,
    CACHE_TTL.coinGecko.markets
  );
}

// GET /coins/{id}/market_chart — historical chart data
export async function getMarketChart(
  coinId: string,
  vsCurrency = 'usd',
  days: number | 'max' = 7
): Promise<CachedResponse<CoinGeckoChartResponse>> {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days: String(days),
  });
  const cacheKey = `coingecko:chart:${coinId}:${vsCurrency}:${days}`;
  return rateLimitedFetch<CoinGeckoChartResponse>(
    `${BASE_URL}/coins/${coinId}/market_chart?${params}`,
    cacheKey,
    CACHE_TTL.coinGecko.chart
  );
}

// GET /coins/{id} — detailed coin data
export interface CoinGeckoDetailResponse {
  id: string;
  symbol: string;
  name: string;
  description: { en: string };
  image: { thumb: string; small: string; large: string };
  market_data: {
    current_price: Record<string, number>;
    market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    high_24h: Record<string, number>;
    low_24h: Record<string, number>;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
  };
  links: { homepage: string[]; blockchain_site: string[] };
}

export async function getCoinDetail(
  coinId: string
): Promise<CachedResponse<CoinGeckoDetailResponse>> {
  const params = new URLSearchParams({
    localization: 'false',
    tickers: 'false',
    community_data: 'false',
    developer_data: 'false',
  });
  const cacheKey = `coingecko:detail:${coinId}`;
  return rateLimitedFetch<CoinGeckoDetailResponse>(
    `${BASE_URL}/coins/${coinId}?${params}`,
    cacheKey,
    CACHE_TTL.coinGecko.detail
  );
}

// GET /simple/price — simple price lookup
export interface SimplePriceResponse {
  [coinId: string]: {
    [currency: string]: number;
  };
}

export async function getSimplePrice(
  coinIds: string[],
  vsCurrencies = ['usd']
): Promise<CachedResponse<SimplePriceResponse>> {
  const params = new URLSearchParams({
    ids: coinIds.join(','),
    vs_currencies: vsCurrencies.join(','),
  });
  const cacheKey = `coingecko:price:${coinIds.sort().join(',')}:${vsCurrencies.sort().join(',')}`;
  return rateLimitedFetch<SimplePriceResponse>(
    `${BASE_URL}/simple/price?${params}`,
    cacheKey,
    CACHE_TTL.coinGecko.price
  );
}

// GET /search/trending — trending coins
export interface TrendingResponse {
  coins: Array<{
    item: {
      id: string;
      coin_id: number;
      name: string;
      symbol: string;
      market_cap_rank: number;
      thumb: string;
      score: number;
    };
  }>;
}

export async function getTrending(): Promise<CachedResponse<TrendingResponse>> {
  const cacheKey = 'coingecko:trending';
  return rateLimitedFetch<TrendingResponse>(
    `${BASE_URL}/search/trending`,
    cacheKey,
    CACHE_TTL.coinGecko.trending
  );
}
