import { cache, CACHE_TTL } from '@/lib/utils/cache';
import { finnhubLimiter } from '@/lib/utils/rate-limiter';
import type {
  FinnhubQuote,
  FinnhubCandle,
  CachedResponse,
} from '@/types/market';

const BASE_URL = 'https://finnhub.io/api/v1';
const WS_URL = 'wss://ws.finnhub.io';

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error('[Finnhub] FINNHUB_API_KEY is not configured');
  }
  return key;
}

async function rateLimitedFetch<T>(
  path: string,
  params: URLSearchParams,
  cacheKey: string,
  ttlSeconds: number
): Promise<CachedResponse<T>> {
  const cached = cache.get<T>(cacheKey);
  if (cached !== null) {
    return { data: cached, cachedAt: Date.now(), isStale: false };
  }

  const result = await finnhubLimiter.acquire();

  if (result.useCached) {
    const stale = cache.get<T>(cacheKey);
    if (stale !== null) {
      return { data: stale, cachedAt: Date.now(), isStale: true };
    }
    throw new Error(
      `[Finnhub] Rate limited and no cached data available for ${cacheKey}`
    );
  }

  params.set('token', getApiKey());
  const response = await fetch(`${BASE_URL}${path}?${params}`);

  if (!response.ok) {
    throw new Error(
      `[Finnhub] HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data: T = await response.json();
  cache.set(cacheKey, data, ttlSeconds);
  return { data, cachedAt: Date.now(), isStale: false };
}

// GET /quote — real-time quote
export async function getQuote(
  symbol: string
): Promise<CachedResponse<FinnhubQuote>> {
  const params = new URLSearchParams({ symbol });
  const cacheKey = `finnhub:quote:${symbol}`;
  return rateLimitedFetch<FinnhubQuote>(
    '/quote',
    params,
    cacheKey,
    CACHE_TTL.finnhub.quote
  );
}

// GET /stock/candle — OHLCV candle data
export type CandleResolution =
  | '1'
  | '5'
  | '15'
  | '30'
  | '60'
  | 'D'
  | 'W'
  | 'M';

export async function getCandles(
  symbol: string,
  resolution: CandleResolution,
  from: number,
  to: number
): Promise<CachedResponse<FinnhubCandle>> {
  const params = new URLSearchParams({
    symbol,
    resolution,
    from: String(from),
    to: String(to),
  });
  const cacheKey = `finnhub:candle:${symbol}:${resolution}:${from}:${to}`;
  return rateLimitedFetch<FinnhubCandle>(
    '/stock/candle',
    params,
    cacheKey,
    CACHE_TTL.finnhub.candle
  );
}

// WebSocket manager for real-time streaming
export interface FinnhubTrade {
  s: string; // symbol
  p: number; // price
  v: number; // volume
  t: number; // timestamp (ms)
}

type TradeHandler = (trades: FinnhubTrade[]) => void;

export class FinnhubWebSocket {
  private ws: WebSocket | null = null;
  private subscriptions = new Set<string>();
  private handlers = new Set<TradeHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): void {
    if (this.ws) return;

    const url = `${WS_URL}?token=${getApiKey()}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Resubscribe to all symbols
      for (const symbol of Array.from(this.subscriptions)) {
        this.sendSubscribe(symbol);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        if (msg.type === 'trade' && msg.data) {
          const trades = msg.data as FinnhubTrade[];
          for (const handler of Array.from(this.handlers)) {
            handler(trades);
          }
        }
      } catch {
        // Ignore parse errors from ping/pong frames
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    if (this.subscriptions.size === 0) return;

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private sendSubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }

  private sendUnsubscribe(symbol: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    }
  }

  subscribe(symbol: string): void {
    this.subscriptions.add(symbol);
    if (!this.ws) {
      this.connect();
    } else {
      this.sendSubscribe(symbol);
    }
  }

  unsubscribe(symbol: string): void {
    this.subscriptions.delete(symbol);
    this.sendUnsubscribe(symbol);
    if (this.subscriptions.size === 0) {
      this.disconnect();
    }
  }

  onTrade(handler: TradeHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent reconnect
    this.ws?.close();
    this.ws = null;
  }
}

// Singleton WebSocket instance
export const finnhubWs = new FinnhubWebSocket();
