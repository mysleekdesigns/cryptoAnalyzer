interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

// TTL constants (in seconds) matching the PRD
export const CACHE_TTL = {
  coinGecko: {
    markets: 60,
    chart: 300,
    detail: 120,
    price: 30,
    trending: 600,
  },
  alphaVantage: {
    daily: 300,
    intraday: 60,
    overview: 3600,
  },
  finnhub: {
    quote: 15,
    candle: 300,
  },
  sentiment: 300,
} as const;

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttlMs) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs: ttlSeconds * 1000,
    });
  }

  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  invalidateByPrefix(prefix: string): number {
    let count = 0;
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

// Singleton cache instance
export const cache = new Cache();
