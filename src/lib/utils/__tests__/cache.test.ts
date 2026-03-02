import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cache, CACHE_TTL } from '../cache';

describe('cache', () => {
  beforeEach(() => {
    cache.clear();
  });

  it('returns null for a missing key', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('stores and retrieves a value', () => {
    cache.set('key1', { price: 100 }, 60);
    expect(cache.get('key1')).toEqual({ price: 100 });
  });

  it('returns null for expired entries', () => {
    vi.useFakeTimers();
    cache.set('key1', 'value', 5);

    // Still valid at 4 seconds
    vi.advanceTimersByTime(4000);
    expect(cache.get('key1')).toBe('value');

    // Expired at 6 seconds
    vi.advanceTimersByTime(2000);
    expect(cache.get('key1')).toBeNull();

    vi.useRealTimers();
  });

  it('invalidates a single key', () => {
    cache.set('key1', 'a', 60);
    cache.set('key2', 'b', 60);

    expect(cache.invalidate('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('b');
  });

  it('invalidate returns false for missing key', () => {
    expect(cache.invalidate('nonexistent')).toBe(false);
  });

  it('invalidates by prefix', () => {
    cache.set('coingecko:markets:usd', 'a', 60);
    cache.set('coingecko:chart:btc', 'b', 60);
    cache.set('alphavantage:daily:AAPL', 'c', 60);

    const count = cache.invalidateByPrefix('coingecko:');
    expect(count).toBe(2);
    expect(cache.get('coingecko:markets:usd')).toBeNull();
    expect(cache.get('coingecko:chart:btc')).toBeNull();
    expect(cache.get('alphavantage:daily:AAPL')).toBe('c');
  });

  it('clears all entries', () => {
    cache.set('a', 1, 60);
    cache.set('b', 2, 60);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('reports correct size', () => {
    expect(cache.size).toBe(0);
    cache.set('a', 1, 60);
    cache.set('b', 2, 60);
    expect(cache.size).toBe(2);
  });

  it('overwrites existing key with new data and TTL', () => {
    vi.useFakeTimers();
    cache.set('key', 'old', 5);
    cache.set('key', 'new', 60);

    vi.advanceTimersByTime(10000);
    // Should still be valid since second set had 60s TTL
    expect(cache.get('key')).toBe('new');
    vi.useRealTimers();
  });

  it('preserves generic types', () => {
    interface TestData {
      id: number;
      name: string;
    }
    const data: TestData = { id: 1, name: 'test' };
    cache.set<TestData>('typed', data, 60);
    const retrieved = cache.get<TestData>('typed');
    expect(retrieved).toEqual(data);
    expect(retrieved?.id).toBe(1);
  });
});

describe('CACHE_TTL constants', () => {
  it('has CoinGecko TTLs matching PRD', () => {
    expect(CACHE_TTL.coinGecko.markets).toBe(60);
    expect(CACHE_TTL.coinGecko.chart).toBe(300);
    expect(CACHE_TTL.coinGecko.detail).toBe(120);
    expect(CACHE_TTL.coinGecko.price).toBe(30);
    expect(CACHE_TTL.coinGecko.trending).toBe(600);
  });

  it('has Alpha Vantage TTLs matching PRD', () => {
    expect(CACHE_TTL.alphaVantage.daily).toBe(300);
    expect(CACHE_TTL.alphaVantage.intraday).toBe(60);
    expect(CACHE_TTL.alphaVantage.overview).toBe(3600);
  });

  it('has Finnhub TTLs matching PRD', () => {
    expect(CACHE_TTL.finnhub.quote).toBe(15);
    expect(CACHE_TTL.finnhub.candle).toBe(300);
  });

  it('has sentiment TTL matching PRD', () => {
    expect(CACHE_TTL.sentiment).toBe(300);
  });
});
