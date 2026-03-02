import { cache, CACHE_TTL } from '@/lib/utils/cache';
import { alphaVantageLimiter } from '@/lib/utils/rate-limiter';
import type {
  AlphaVantageTimeSeries,
  AlphaVantageOverview,
  CachedResponse,
} from '@/types/market';

const BASE_URL = 'https://www.alphavantage.co/query';

function getApiKey(): string {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) {
    throw new Error('[AlphaVantage] ALPHA_VANTAGE_API_KEY is not configured');
  }
  return key;
}

async function rateLimitedFetch<T>(
  params: URLSearchParams,
  cacheKey: string,
  ttlSeconds: number
): Promise<CachedResponse<T>> {
  const cached = cache.get<T>(cacheKey);
  if (cached !== null) {
    return { data: cached, cachedAt: Date.now(), isStale: false };
  }

  const result = await alphaVantageLimiter.acquire();

  if (result.useCached) {
    const stale = cache.get<T>(cacheKey);
    if (stale !== null) {
      return { data: stale, cachedAt: Date.now(), isStale: true };
    }
    throw new Error(
      `[AlphaVantage] Rate limited and no cached data available for ${cacheKey}`
    );
  }

  params.set('apikey', getApiKey());
  const response = await fetch(`${BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(
      `[AlphaVantage] HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();

  // Alpha Vantage returns errors as 200 with an error message in the body
  if (data['Error Message']) {
    throw new Error(`[AlphaVantage] ${data['Error Message']}`);
  }
  if (data['Note']) {
    // Rate limit note from Alpha Vantage
    throw new Error(`[AlphaVantage] ${data['Note']}`);
  }

  cache.set(cacheKey, data as T, ttlSeconds);
  return { data: data as T, cachedAt: Date.now(), isStale: false };
}

// TIME_SERIES_DAILY
export interface DailyTimeSeriesResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Output Size': string;
    '5. Time Zone': string;
  };
  'Time Series (Daily)': AlphaVantageTimeSeries;
}

export async function getDailyTimeSeries(
  symbol: string,
  outputSize: 'compact' | 'full' = 'compact'
): Promise<CachedResponse<DailyTimeSeriesResponse>> {
  const params = new URLSearchParams({
    function: 'TIME_SERIES_DAILY',
    symbol,
    outputsize: outputSize,
  });
  const cacheKey = `alphavantage:daily:${symbol}:${outputSize}`;
  return rateLimitedFetch<DailyTimeSeriesResponse>(
    params,
    cacheKey,
    CACHE_TTL.alphaVantage.daily
  );
}

// TIME_SERIES_INTRADAY
export type IntradayInterval = '1min' | '5min' | '15min' | '30min' | '60min';

export interface IntradayTimeSeriesResponse {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval': string;
    '5. Output Size': string;
    '6. Time Zone': string;
  };
  [key: string]: AlphaVantageTimeSeries | Record<string, string>;
}

export async function getIntradayTimeSeries(
  symbol: string,
  interval: IntradayInterval = '5min',
  outputSize: 'compact' | 'full' = 'compact'
): Promise<CachedResponse<IntradayTimeSeriesResponse>> {
  const params = new URLSearchParams({
    function: 'TIME_SERIES_INTRADAY',
    symbol,
    interval,
    outputsize: outputSize,
  });
  const cacheKey = `alphavantage:intraday:${symbol}:${interval}:${outputSize}`;
  return rateLimitedFetch<IntradayTimeSeriesResponse>(
    params,
    cacheKey,
    CACHE_TTL.alphaVantage.intraday
  );
}

// OVERVIEW — company fundamentals
export async function getCompanyOverview(
  symbol: string
): Promise<CachedResponse<AlphaVantageOverview>> {
  const params = new URLSearchParams({
    function: 'OVERVIEW',
    symbol,
  });
  const cacheKey = `alphavantage:overview:${symbol}`;
  return rateLimitedFetch<AlphaVantageOverview>(
    params,
    cacheKey,
    CACHE_TTL.alphaVantage.overview
  );
}
