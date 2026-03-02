import { cache, CACHE_TTL } from '@/lib/utils/cache';
import type { FearGreedData, CachedResponse } from '@/types/market';

const BASE_URL = 'https://api.alternative.me/fng';

interface AlternativeMeResponse {
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
  }>;
}

export async function getFearGreedIndex(): Promise<
  CachedResponse<FearGreedData>
> {
  const cacheKey = 'sentiment:feargreed';

  const cached = cache.get<FearGreedData>(cacheKey);
  if (cached !== null) {
    return { data: cached, cachedAt: Date.now(), isStale: false };
  }

  const response = await fetch(`${BASE_URL}/?limit=1&format=json`);

  if (!response.ok) {
    throw new Error(
      `[Sentiment] HTTP ${response.status}: ${response.statusText}`
    );
  }

  const raw: AlternativeMeResponse = await response.json();
  const entry = raw.data[0];

  const data: FearGreedData = {
    value: parseInt(entry.value, 10),
    valueClassification: entry.value_classification,
    timestamp: parseInt(entry.timestamp, 10) * 1000,
  };

  cache.set(cacheKey, data, CACHE_TTL.sentiment);
  return { data, cachedAt: Date.now(), isStale: false };
}

// Get historical fear & greed data
export async function getFearGreedHistory(
  days: number = 30
): Promise<CachedResponse<FearGreedData[]>> {
  const cacheKey = `sentiment:feargreed:history:${days}`;

  const cached = cache.get<FearGreedData[]>(cacheKey);
  if (cached !== null) {
    return { data: cached, cachedAt: Date.now(), isStale: false };
  }

  const response = await fetch(`${BASE_URL}/?limit=${days}&format=json`);

  if (!response.ok) {
    throw new Error(
      `[Sentiment] HTTP ${response.status}: ${response.statusText}`
    );
  }

  const raw: AlternativeMeResponse = await response.json();

  const data: FearGreedData[] = raw.data.map((entry) => ({
    value: parseInt(entry.value, 10),
    valueClassification: entry.value_classification,
    timestamp: parseInt(entry.timestamp, 10) * 1000,
  }));

  cache.set(cacheKey, data, CACHE_TTL.sentiment);
  return { data, cachedAt: Date.now(), isStale: false };
}
