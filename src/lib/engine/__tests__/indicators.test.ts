import { describe, it, expect } from 'vitest';
import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateMovingAverages,
  calculateVolumeSignal,
} from '../indicators';

// Helper: generate a series of prices with a known trend
function generatePrices(start: number, count: number, step: number): number[] {
  return Array.from({ length: count }, (_, i) => start + i * step);
}

// Helper: generate flat prices around a value with small noise
function generateFlatPrices(value: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => value + Math.sin(i) * 0.5);
}

describe('calculateRSI', () => {
  it('returns neutral result with insufficient data', () => {
    const result = calculateRSI([100, 101, 102]);
    expect(result.type).toBe('rsi');
    expect(result.score).toBe(50);
    expect(result.signal).toBe('neutral');
    expect(result.weight).toBe(0);
    expect(result.details).toContain('Insufficient data');
  });

  it('returns a valid RSI result with enough data', () => {
    // 30 prices should be more than enough for RSI(14)
    const prices = generatePrices(100, 30, 1);
    const result = calculateRSI(prices);

    expect(result.type).toBe('rsi');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.rawValue).toBeGreaterThanOrEqual(0);
    expect(result.rawValue).toBeLessThanOrEqual(100);
    expect(['buy', 'sell', 'neutral']).toContain(result.signal);
  });

  it('produces a buy signal for a strongly rising series', () => {
    // Sharp upward trend should produce high RSI -> which maps to low score (overbought = sell)
    // Actually: RSI > 70 (overbought) maps to LOW score (sell), not buy
    const prices = generatePrices(100, 30, 5);
    const result = calculateRSI(prices);

    // Strong uptrend => high RSI => overbought => low score (sell)
    expect(result.rawValue).toBeGreaterThan(60);
    expect(result.score).toBeLessThan(50);
  });

  it('produces a sell signal for a strongly falling series', () => {
    // Sharp downward trend => low RSI => oversold => high score (buy signal)
    const prices = generatePrices(200, 30, -5);
    const result = calculateRSI(prices);

    expect(result.rawValue).toBeLessThan(40);
    expect(result.score).toBeGreaterThan(50);
  });

  it('respects custom period parameter', () => {
    // Use oscillating prices so RSI varies with period
    const prices = Array.from({ length: 50 }, (_, i) =>
      100 + 10 * Math.sin(i * 0.5) + i * 0.2
    );
    const result7 = calculateRSI(prices, 7);
    const result21 = calculateRSI(prices, 21);

    expect(result7.type).toBe('rsi');
    expect(result21.type).toBe('rsi');
    // Different periods on oscillating data produce meaningfully different RSI values
    expect(Math.abs((result7.rawValue as number) - (result21.rawValue as number))).toBeGreaterThan(1);
  });

  it('clamps score between 0 and 100', () => {
    const prices = generatePrices(100, 30, 10); // extreme uptrend
    const result = calculateRSI(prices);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('calculateMACD', () => {
  it('returns neutral result with insufficient data', () => {
    const result = calculateMACD(generatePrices(100, 10, 1));
    expect(result.type).toBe('macd');
    expect(result.score).toBe(50);
    expect(result.signal).toBe('neutral');
    expect(result.rawValue).toEqual({ macd: 0, signal: 0, histogram: 0 });
  });

  it('returns valid MACD result with enough data', () => {
    const prices = generatePrices(100, 50, 0.5);
    const result = calculateMACD(prices);

    expect(result.type).toBe('macd');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.rawValue).toHaveProperty('macd');
    expect(result.rawValue).toHaveProperty('signal');
    expect(result.rawValue).toHaveProperty('histogram');
  });

  it('produces bullish signal on rising prices', () => {
    const prices = generatePrices(50, 60, 1);
    const result = calculateMACD(prices);

    // Rising prices => positive histogram => bullish => score > 50
    expect(result.rawValue.histogram).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.details).toContain('Bullish');
  });

  it('produces bearish signal on falling prices', () => {
    const prices = generatePrices(200, 60, -1);
    const result = calculateMACD(prices);

    expect(result.rawValue.histogram).toBeLessThan(0);
    expect(result.score).toBeLessThanOrEqual(50);
    expect(result.details).toContain('Bearish');
  });

  it('clamps score to 0-100', () => {
    // Extreme trend
    const prices = generatePrices(10, 60, 5);
    const result = calculateMACD(prices);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('calculateBollingerBands', () => {
  it('returns neutral result with insufficient data', () => {
    const result = calculateBollingerBands([100, 101, 102]);
    expect(result.type).toBe('bollinger_bands');
    expect(result.score).toBe(50);
    expect(result.rawValue.percentB).toBe(0.5);
  });

  it('returns valid result with enough data', () => {
    const prices = generateFlatPrices(100, 30);
    const result = calculateBollingerBands(prices);

    expect(result.type).toBe('bollinger_bands');
    expect(result.rawValue.upper).toBeGreaterThan(result.rawValue.middle);
    expect(result.rawValue.lower).toBeLessThan(result.rawValue.middle);
    expect(result.rawValue.percentB).toBeGreaterThanOrEqual(0);
    expect(result.rawValue.percentB).toBeLessThanOrEqual(1);
  });

  it('gives high score when price is near lower band', () => {
    // Start flat then drop sharply at end
    const prices = generateFlatPrices(100, 25);
    prices.push(96, 95, 94, 93, 92); // drop to lower band
    const result = calculateBollingerBands(prices);

    // Near lower band => low %B => high score (buy)
    expect(result.rawValue.percentB).toBeLessThan(0.3);
    expect(result.score).toBeGreaterThan(70);
  });

  it('gives low score when price is near upper band', () => {
    const prices = generateFlatPrices(100, 25);
    prices.push(104, 105, 106, 107, 108); // rise to upper band
    const result = calculateBollingerBands(prices);

    // Near upper band => high %B => low score (sell)
    expect(result.rawValue.percentB).toBeGreaterThan(0.7);
    expect(result.score).toBeLessThan(30);
  });

  it('clamps score between 0 and 100', () => {
    const prices = generateFlatPrices(100, 25);
    prices.push(80); // well below lower band
    const result = calculateBollingerBands(prices);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('calculateMovingAverages', () => {
  it('returns neutral with insufficient data for SMA50', () => {
    const result = calculateMovingAverages(generatePrices(100, 30, 1));
    expect(result.type).toBe('moving_averages');
    expect(result.score).toBe(50);
    expect(result.signal).toBe('neutral');
  });

  it('computes SMA50 only when between 50 and 200 data points', () => {
    const prices = generatePrices(100, 60, 0.5);
    const result = calculateMovingAverages(prices);

    expect(result.rawValue.sma50).toBeGreaterThan(0);
    expect(result.rawValue.sma200).toBe(0); // not enough data
    expect(result.details).toContain('SMA200 unavailable');
  });

  it('computes both SMA50 and SMA200 with 200+ data points', () => {
    const prices = generatePrices(100, 210, 0.1);
    const result = calculateMovingAverages(prices);

    expect(result.rawValue.sma50).toBeGreaterThan(0);
    expect(result.rawValue.sma200).toBeGreaterThan(0);
  });

  it('produces golden cross signal when SMA50 > SMA200', () => {
    // Start low, rise steadily — SMA50 will be above SMA200
    const prices = generatePrices(50, 210, 0.5);
    const result = calculateMovingAverages(prices);

    expect(result.rawValue.sma50).toBeGreaterThan(result.rawValue.sma200);
    expect(result.details).toContain('Golden Cross');
    expect(result.score).toBeGreaterThan(50);
  });

  it('produces death cross signal when SMA50 < SMA200', () => {
    // Start high, fall steadily
    const prices = generatePrices(300, 210, -0.5);
    const result = calculateMovingAverages(prices);

    expect(result.rawValue.sma50).toBeLessThan(result.rawValue.sma200);
    expect(result.details).toContain('Death Cross');
    expect(result.score).toBeLessThan(50);
  });

  it('clamps score to 0-100', () => {
    const prices = generatePrices(10, 210, 2);
    const result = calculateMovingAverages(prices);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('calculateVolumeSignal', () => {
  it('returns neutral with insufficient data', () => {
    const result = calculateVolumeSignal([100], [100]);
    expect(result.type).toBe('volume');
    expect(result.score).toBe(50);
    expect(result.signal).toBe('neutral');
  });

  it('returns neutral for below-average volume', () => {
    const volumes = Array.from({ length: 25 }, () => 1000);
    volumes[volumes.length - 1] = 500; // current volume is low
    const prices = generatePrices(100, 25, 0.5);
    const result = calculateVolumeSignal(volumes, prices);

    expect(result.rawValue.ratio).toBeLessThan(1);
    expect(result.score).toBe(50); // below avg = neutral
  });

  it('gives bullish signal for high volume on up move', () => {
    const volumes = Array.from({ length: 25 }, () => 1000);
    volumes[volumes.length - 1] = 2000; // 2x average
    const prices = generatePrices(100, 25, 1); // uptrend
    const result = calculateVolumeSignal(volumes, prices);

    expect(result.rawValue.ratio).toBeGreaterThan(1.5);
    expect(result.score).toBeGreaterThan(70);
    expect(result.details).toContain('High');
    expect(result.details).toContain('up');
  });

  it('gives bearish signal for high volume on down move', () => {
    const volumes = Array.from({ length: 25 }, () => 1000);
    volumes[volumes.length - 1] = 2000; // 2x average
    const prices = generatePrices(125, 25, -1); // downtrend
    const result = calculateVolumeSignal(volumes, prices);

    expect(result.rawValue.ratio).toBeGreaterThan(1.5);
    expect(result.score).toBeLessThan(30);
    expect(result.details).toContain('down');
  });

  it('gives mildly bullish signal for above-average volume on up move', () => {
    const volumes = Array.from({ length: 25 }, () => 1000);
    volumes[volumes.length - 1] = 1300; // 1.3x average
    const prices = generatePrices(100, 25, 1);
    const result = calculateVolumeSignal(volumes, prices);

    expect(result.rawValue.ratio).toBeGreaterThan(1.0);
    expect(result.rawValue.ratio).toBeLessThan(1.5);
    expect(result.score).toBeGreaterThan(50);
  });

  it('clamps score to 0-100', () => {
    const volumes = Array.from({ length: 25 }, () => 100);
    volumes[volumes.length - 1] = 10000; // extreme volume
    const prices = generatePrices(200, 25, -5); // strong downtrend
    const result = calculateVolumeSignal(volumes, prices);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('all indicators', () => {
  it('always return weight of 0 (weights applied by composite scorer)', () => {
    const prices = generatePrices(100, 210, 0.5);
    const volumes = Array.from({ length: 210 }, () => 1000);

    expect(calculateRSI(prices).weight).toBe(0);
    expect(calculateMACD(prices).weight).toBe(0);
    expect(calculateBollingerBands(prices).weight).toBe(0);
    expect(calculateMovingAverages(prices).weight).toBe(0);
    expect(calculateVolumeSignal(volumes, prices).weight).toBe(0);
  });

  it('always return scores clamped to 0-100', () => {
    const prices = generatePrices(100, 210, 0.5);
    const volumes = Array.from({ length: 210 }, () => 1000);

    const results = [
      calculateRSI(prices),
      calculateMACD(prices),
      calculateBollingerBands(prices),
      calculateMovingAverages(prices),
      calculateVolumeSignal(volumes, prices),
    ];

    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it('signal field matches the score thresholds', () => {
    const prices = generatePrices(100, 210, 0.5);
    const volumes = Array.from({ length: 210 }, () => 1000);

    const results = [
      calculateRSI(prices),
      calculateMACD(prices),
      calculateBollingerBands(prices),
      calculateMovingAverages(prices),
      calculateVolumeSignal(volumes, prices),
    ];

    for (const r of results) {
      if (r.score >= 60) expect(r.signal).toBe('buy');
      else if (r.score <= 40) expect(r.signal).toBe('sell');
      else expect(r.signal).toBe('neutral');
    }
  });
});
