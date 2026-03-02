import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter, createRateLimiter } from '../rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = createRateLimiter({
      name: 'Test',
      maxRequests: 5,
      windowMs: 1000,
    });
  });

  it('allows requests within the limit', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await limiter.acquire();
      expect(result.allowed).toBe(true);
      expect(result.useCached).toBe(false);
    }
  });

  it('reports correct remaining count', async () => {
    expect(limiter.remaining).toBe(5);
    await limiter.acquire();
    expect(limiter.remaining).toBe(4);
    await limiter.acquire();
    expect(limiter.remaining).toBe(3);
  });

  it('warns at 80% capacity', async () => {
    // threshold = floor(5 * 0.8) = 4
    // Warning fires when count >= 4 && count < 5, which is checked BEFORE
    // the new timestamp is added. So count=4 means 4 timestamps already exist
    // (from prior calls), meaning the 5th acquire sees count=4 and warns.

    // Make 4 calls to fill timestamps to 4
    for (let i = 0; i < 4; i++) {
      await limiter.acquire();
    }

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // 5th call sees count=4, which is >= threshold(4) and < max(5) => warns
    await limiter.acquire();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[RateLimiter:Test]')
    );

    warnSpy.mockRestore();
  });

  it('signals useCached for long waits when at capacity', async () => {
    // Use a limiter with a long window to trigger the >10s threshold
    const slowLimiter = createRateLimiter({
      name: 'Slow',
      maxRequests: 2,
      windowMs: 60_000,
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await slowLimiter.acquire();
    await slowLimiter.acquire();

    // Next request should immediately return useCached=true (wait > 10s)
    const result = await slowLimiter.acquire();
    expect(result.allowed).toBe(false);
    expect(result.useCached).toBe(true);
    expect(result.retryAfterMs).toBeGreaterThan(10_000);

    warnSpy.mockRestore();
  });

  it('prunes expired timestamps and allows new requests', async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Fill to capacity
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    expect(limiter.remaining).toBe(0);

    // Advance past the window
    vi.advanceTimersByTime(1100);

    // Should have capacity again
    expect(limiter.remaining).toBe(5);
    const result = await limiter.acquire();
    expect(result.allowed).toBe(true);

    warnSpy.mockRestore();
    vi.useRealTimers();
  });

  it('resets all state', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await limiter.acquire();
    await limiter.acquire();
    limiter.reset();
    expect(limiter.remaining).toBe(5);

    warnSpy.mockRestore();
  });
});

describe('createRateLimiter', () => {
  it('creates a RateLimiter instance', () => {
    const limiter = createRateLimiter({
      name: 'Custom',
      maxRequests: 10,
      windowMs: 5000,
    });
    expect(limiter).toBeInstanceOf(RateLimiter);
    expect(limiter.remaining).toBe(10);
  });
});
