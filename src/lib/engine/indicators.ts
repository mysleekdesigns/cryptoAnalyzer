import { RSI, MACD, BollingerBands, SMA, EMA } from 'trading-signals';
import type {
  RSIResult,
  MACDResult,
  BollingerBandsResult,
  MovingAveragesResult,
  VolumeResult,
} from '@/types/signals';

const MIN_RSI_PERIODS = 15; // RSI(14) needs at least period + 1 data points
const MIN_MACD_PERIODS = 35; // MACD(12,26,9) needs ~26+9 data points
const MIN_BB_PERIODS = 20;
const MIN_MA50_PERIODS = 50;
const MIN_MA200_PERIODS = 200;
const MIN_VOLUME_PERIODS = 21; // 20-day avg + current

function neutralResult<T extends RSIResult | MACDResult | BollingerBandsResult | MovingAveragesResult | VolumeResult>(
  type: T['type'],
  rawValue: T['rawValue'],
  details: string,
): T {
  return {
    type,
    score: 50,
    weight: 0,
    rawValue,
    signal: 'neutral',
    details,
  } as T;
}

function scoreToSignal(score: number): 'buy' | 'sell' | 'neutral' {
  if (score >= 60) return 'buy';
  if (score <= 40) return 'sell';
  return 'neutral';
}

/**
 * Calculate RSI and map to a 0-100 buy/sell score.
 * RSI < 30 (oversold) maps to high score (buy signal).
 * RSI > 70 (overbought) maps to low score (sell signal).
 * Linear interpolation between thresholds.
 */
export function calculateRSI(prices: number[], period = 14): RSIResult {
  if (prices.length < period + 1) {
    return neutralResult<RSIResult>('rsi', 0, `Insufficient data: need ${period + 1} prices, got ${prices.length}`);
  }

  const rsi = new RSI(period);
  for (const price of prices) {
    rsi.update(price, false);
  }

  if (!rsi.isStable) {
    return neutralResult<RSIResult>('rsi', 0, 'RSI not yet stable');
  }

  const rsiValue = Number(rsi.getResult());

  // Map RSI to score: oversold (< 30) = high score, overbought (> 70) = low score
  let score: number;
  if (rsiValue <= 30) {
    // RSI 0-30 maps to score 70-100 (buy zone)
    score = 70 + ((30 - rsiValue) / 30) * 30;
  } else if (rsiValue >= 70) {
    // RSI 70-100 maps to score 0-30 (sell zone)
    score = 30 - ((rsiValue - 70) / 30) * 30;
  } else {
    // RSI 30-70 maps to score 30-70 (linear interpolation, inverted)
    score = 70 - ((rsiValue - 30) / 40) * 40;
  }

  score = Math.max(0, Math.min(100, score));

  let details: string;
  if (rsiValue < 30) details = `RSI(${period}) = ${rsiValue.toFixed(2)} - Oversold`;
  else if (rsiValue > 70) details = `RSI(${period}) = ${rsiValue.toFixed(2)} - Overbought`;
  else details = `RSI(${period}) = ${rsiValue.toFixed(2)} - Neutral`;

  return {
    type: 'rsi',
    score,
    weight: 0,
    rawValue: rsiValue,
    signal: scoreToSignal(score),
    details,
  };
}

/**
 * Calculate MACD(12, 26, 9) and map crossover signals to a 0-100 score.
 * Bullish crossover (MACD > signal, positive histogram) = high score.
 * Bearish crossover (MACD < signal, negative histogram) = low score.
 */
export function calculateMACD(prices: number[]): MACDResult {
  if (prices.length < MIN_MACD_PERIODS) {
    return neutralResult<MACDResult>('macd', { macd: 0, signal: 0, histogram: 0 },
      `Insufficient data: need ${MIN_MACD_PERIODS} prices, got ${prices.length}`);
  }

  const macd = new MACD(new EMA(12), new EMA(26), new EMA(9));
  for (const price of prices) {
    macd.update(price, false);
  }

  if (!macd.isStable) {
    return neutralResult<MACDResult>('macd', { macd: 0, signal: 0, histogram: 0 }, 'MACD not yet stable');
  }

  const result = macd.getResult();
  if (!result) {
    return neutralResult<MACDResult>('macd', { macd: 0, signal: 0, histogram: 0 }, 'MACD returned no result');
  }
  const macdValue = Number(result.macd);
  const signalValue = Number(result.signal);
  const histogram = Number(result.histogram);

  // Normalize histogram relative to the current price for consistent scoring
  const currentPrice = prices[prices.length - 1];
  const normalizedHistogram = (histogram / currentPrice) * 100;

  // Map histogram to score: positive = bullish, negative = bearish
  // Use sigmoid-like mapping to keep within bounds
  const score = Math.max(0, Math.min(100, 50 + normalizedHistogram * 50));

  const crossover = histogram > 0 ? 'Bullish' : histogram < 0 ? 'Bearish' : 'Neutral';
  const details = `MACD(12,26,9): ${macdValue.toFixed(4)}, Signal: ${signalValue.toFixed(4)}, Histogram: ${histogram.toFixed(4)} - ${crossover} crossover`;

  return {
    type: 'macd',
    score,
    weight: 0,
    rawValue: { macd: macdValue, signal: signalValue, histogram },
    signal: scoreToSignal(score),
    details,
  };
}

/**
 * Calculate Bollinger Bands(20, 2) and map price position to a 0-100 score.
 * Price near lower band = high score (buy), near upper band = low score (sell).
 * Uses %B (percent bandwidth) for position within bands.
 */
export function calculateBollingerBands(prices: number[], period = 20): BollingerBandsResult {
  if (prices.length < period) {
    return neutralResult<BollingerBandsResult>('bollinger_bands',
      { upper: 0, middle: 0, lower: 0, percentB: 0.5 },
      `Insufficient data: need ${period} prices, got ${prices.length}`);
  }

  const bb = new BollingerBands(period, 2);
  for (const price of prices) {
    bb.update(price, false);
  }

  if (!bb.isStable) {
    return neutralResult<BollingerBandsResult>('bollinger_bands',
      { upper: 0, middle: 0, lower: 0, percentB: 0.5 },
      'Bollinger Bands not yet stable');
  }

  const result = bb.getResult();
  if (!result) {
    return neutralResult<BollingerBandsResult>('bollinger_bands',
      { upper: 0, middle: 0, lower: 0, percentB: 0.5 },
      'Bollinger Bands returned no result');
  }
  const upper = Number(result.upper);
  const middle = Number(result.middle);
  const lower = Number(result.lower);
  const currentPrice = prices[prices.length - 1];

  // %B = (Price - Lower) / (Upper - Lower)
  const bandwidth = upper - lower;
  const percentB = bandwidth > 0 ? (currentPrice - lower) / bandwidth : 0.5;

  // Map %B to score: low %B (near lower band) = buy, high %B (near upper band) = sell
  // %B 0 = score 100, %B 1 = score 0
  const score = Math.max(0, Math.min(100, (1 - percentB) * 100));

  let details: string;
  if (percentB < 0.2) details = `BB(${period},2): Price near lower band (%B: ${percentB.toFixed(2)}) - Oversold`;
  else if (percentB > 0.8) details = `BB(${period},2): Price near upper band (%B: ${percentB.toFixed(2)}) - Overbought`;
  else details = `BB(${period},2): Price within bands (%B: ${percentB.toFixed(2)})`;

  return {
    type: 'bollinger_bands',
    score,
    weight: 0,
    rawValue: { upper, middle, lower, percentB },
    signal: scoreToSignal(score),
    details,
  };
}

/**
 * Calculate 50-day and 200-day SMAs and map crossover to a 0-100 score.
 * Golden cross (SMA50 > SMA200) = high score (buy).
 * Death cross (SMA50 < SMA200) = low score (sell).
 * Distance between MAs indicates strength.
 */
export function calculateMovingAverages(prices: number[]): MovingAveragesResult {
  if (prices.length < MIN_MA200_PERIODS) {
    // Can still compute SMA50 if enough data
    if (prices.length < MIN_MA50_PERIODS) {
      return neutralResult<MovingAveragesResult>('moving_averages',
        { sma50: 0, sma200: 0, distance: 0 },
        `Insufficient data: need ${MIN_MA200_PERIODS} prices, got ${prices.length}`);
    }

    // Compute only SMA50 with partial scoring
    const sma50 = new SMA(50);
    for (const price of prices) sma50.update(price, false);
    const sma50Value = Number(sma50.getResult());
    const currentPrice = prices[prices.length - 1];
    const distanceFrom50 = ((currentPrice - sma50Value) / sma50Value) * 100;

    // Price above SMA50 is mildly bullish, below is mildly bearish
    const score = Math.max(0, Math.min(100, 50 + distanceFrom50 * 2));

    return {
      type: 'moving_averages',
      score,
      weight: 0,
      rawValue: { sma50: sma50Value, sma200: 0, distance: 0 },
      signal: scoreToSignal(score),
      details: `SMA50: ${sma50Value.toFixed(2)} (SMA200 unavailable, need ${MIN_MA200_PERIODS} data points)`,
    };
  }

  const sma50 = new SMA(50);
  const sma200 = new SMA(200);
  for (const price of prices) {
    sma50.update(price, false);
    sma200.update(price, false);
  }

  const sma50Value = Number(sma50.getResult());
  const sma200Value = Number(sma200.getResult());

  // Distance as percentage
  const distance = ((sma50Value - sma200Value) / sma200Value) * 100;

  // Map distance to score: positive distance (golden cross) = bullish
  // Cap influence at ~10% distance
  const normalizedDistance = Math.max(-10, Math.min(10, distance));
  const score = Math.max(0, Math.min(100, 50 + normalizedDistance * 5));

  const crossType = sma50Value > sma200Value ? 'Golden Cross' : 'Death Cross';
  const details = `SMA50: ${sma50Value.toFixed(2)}, SMA200: ${sma200Value.toFixed(2)}, Distance: ${distance.toFixed(2)}% - ${crossType}`;

  return {
    type: 'moving_averages',
    score,
    weight: 0,
    rawValue: { sma50: sma50Value, sma200: sma200Value, distance },
    signal: scoreToSignal(score),
    details,
  };
}

/**
 * Calculate volume signal based on 20-day average volume and price direction.
 * Volume > 1.5x avg on up move = bullish (high score).
 * Volume > 1.5x avg on down move = bearish (low score).
 * Normal volume = neutral score ~50.
 */
export function calculateVolumeSignal(volumes: number[], prices: number[]): VolumeResult {
  if (volumes.length < MIN_VOLUME_PERIODS || prices.length < 2) {
    return neutralResult<VolumeResult>('volume',
      { currentVolume: 0, averageVolume: 0, ratio: 1 },
      `Insufficient data: need ${MIN_VOLUME_PERIODS} volume points, got ${volumes.length}`);
  }

  // 20-day average volume (excluding the most recent day)
  const recentVolumes = volumes.slice(-21, -1);
  const averageVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
  const currentVolume = volumes[volumes.length - 1];
  const ratio = averageVolume > 0 ? currentVolume / averageVolume : 1;

  // Determine price direction from last two closes
  const currentPrice = prices[prices.length - 1];
  const previousPrice = prices[prices.length - 2];
  const priceUp = currentPrice > previousPrice;

  let score: number;
  if (ratio > 1.5) {
    // High volume
    score = priceUp ? 75 + Math.min(25, (ratio - 1.5) * 25) : 25 - Math.min(25, (ratio - 1.5) * 25);
  } else if (ratio > 1.0) {
    // Slightly above average
    score = priceUp ? 55 + (ratio - 1.0) * 40 : 45 - (ratio - 1.0) * 40;
  } else {
    // Below average volume - weak signal, lean toward neutral
    score = 50;
  }

  score = Math.max(0, Math.min(100, score));

  const volumeDesc = ratio > 1.5 ? 'High' : ratio > 1.0 ? 'Above average' : 'Below average';
  const dirDesc = priceUp ? 'up' : 'down';
  const details = `Volume: ${volumeDesc} (${ratio.toFixed(2)}x avg) on ${dirDesc} move`;

  return {
    type: 'volume',
    score,
    weight: 0,
    rawValue: { currentVolume, averageVolume, ratio },
    signal: scoreToSignal(score),
    details,
  };
}
