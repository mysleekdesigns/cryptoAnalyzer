export interface RateLimiterConfig {
  name: string;
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number | null;
  useCached: boolean;
}

interface QueuedRequest {
  resolve: (result: RateLimitResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class RateLimiter {
  private timestamps: number[] = [];
  private queue: QueuedRequest[] = [];
  private readonly config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  private pruneExpired(now: number): void {
    const cutoff = now - this.config.windowMs;
    // timestamps are in order, find first valid index
    let i = 0;
    while (i < this.timestamps.length && this.timestamps[i] <= cutoff) {
      i++;
    }
    if (i > 0) {
      this.timestamps.splice(0, i);
    }
  }

  get remaining(): number {
    this.pruneExpired(Date.now());
    return Math.max(0, this.config.maxRequests - this.timestamps.length);
  }

  async acquire(): Promise<RateLimitResult> {
    const now = Date.now();
    this.pruneExpired(now);

    const count = this.timestamps.length;
    const threshold = Math.floor(this.config.maxRequests * 0.8);

    if (count >= threshold && count < this.config.maxRequests) {
      console.warn(
        `[RateLimiter:${this.config.name}] ${count}/${this.config.maxRequests} requests used (${Math.round((count / this.config.maxRequests) * 100)}% capacity)`
      );
    }

    if (count < this.config.maxRequests) {
      this.timestamps.push(now);
      return { allowed: true, retryAfterMs: null, useCached: false };
    }

    // At capacity — enqueue the request
    const oldestExpiry = this.timestamps[0] + this.config.windowMs;
    const waitMs = oldestExpiry - now;

    // If wait is unreasonably long, signal to use cache immediately
    if (waitMs > 10_000) {
      return { allowed: false, retryAfterMs: waitMs, useCached: true };
    }

    return new Promise<RateLimitResult>((resolve) => {
      const timer = setTimeout(() => {
        this.removeFromQueue(queued);
        const retryNow = Date.now();
        this.pruneExpired(retryNow);
        if (this.timestamps.length < this.config.maxRequests) {
          this.timestamps.push(retryNow);
          resolve({ allowed: true, retryAfterMs: null, useCached: false });
        } else {
          resolve({ allowed: false, retryAfterMs: null, useCached: true });
        }
      }, waitMs);

      const queued: QueuedRequest = { resolve, timer };
      this.queue.push(queued);
    });
  }

  private removeFromQueue(item: QueuedRequest): void {
    const idx = this.queue.indexOf(item);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
    }
  }

  reset(): void {
    this.timestamps = [];
    for (const q of this.queue) {
      clearTimeout(q.timer);
      q.resolve({ allowed: false, retryAfterMs: null, useCached: true });
    }
    this.queue = [];
  }
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  return new RateLimiter(config);
}

// Pre-configured rate limiters per API
export const coinGeckoLimiter = createRateLimiter({
  name: 'CoinGecko',
  maxRequests: 30,
  windowMs: 60_000, // 30 per minute
});

export const coinGeckoMonthlyLimiter = createRateLimiter({
  name: 'CoinGecko-Monthly',
  maxRequests: 10_000,
  windowMs: 30 * 24 * 60 * 60 * 1000, // 10,000 per month
});

export const alphaVantageLimiter = createRateLimiter({
  name: 'AlphaVantage',
  maxRequests: 25,
  windowMs: 24 * 60 * 60 * 1000, // 25 per day
});

export const finnhubLimiter = createRateLimiter({
  name: 'Finnhub',
  maxRequests: 60,
  windowMs: 60_000, // 60 per minute
});
