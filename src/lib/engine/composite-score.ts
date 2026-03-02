import type {
  IndicatorResult,
  IndicatorWeights,
  SentimentModifier,
  CrossConfirmation,
  SignalType,
  RSIResult,
  MACDResult,
} from '@/types/signals';
import { SIGNAL_THRESHOLDS } from '@/types/signals';

/**
 * Clamp a number between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate the weighted composite score from indicator results.
 * Each indicator's score (0-100) is multiplied by its weight and summed.
 * Optionally applies a sentiment modifier.
 */
export function calculateCompositeScore(
  indicators: IndicatorResult[],
  weights: IndicatorWeights,
  sentimentValue?: number,
): { rawScore: number; compositeScore: number; sentiment: SentimentModifier } {
  let rawScore = 0;
  let totalWeight = 0;

  for (const indicator of indicators) {
    const weight = weights[indicator.type];
    rawScore += indicator.score * weight;
    totalWeight += weight;
  }

  // Normalize if weights don't sum to 1.0 (defensive)
  if (totalWeight > 0 && Math.abs(totalWeight - 1.0) > 0.001) {
    rawScore = rawScore / totalWeight;
  }

  rawScore = clamp(rawScore, 0, 100);

  const sentiment = sentimentValue !== undefined
    ? applySentimentModifier(rawScore, sentimentValue)
    : { fearGreedValue: 50, classification: 'Neutral', modifier: 0 };

  const compositeScore = clamp(rawScore + sentiment.modifier, 0, 100);

  return { rawScore, compositeScore, sentiment };
}

/**
 * Apply a sentiment modifier based on Fear & Greed index.
 * Extreme Fear (0-25): +5 points (contrarian buy signal)
 * Fear (25-45): +2 points
 * Neutral (45-55): 0 points
 * Greed (55-75): -2 points
 * Extreme Greed (75-100): -5 points (contrarian sell signal)
 */
export function applySentimentModifier(score: number, fearGreedValue: number): SentimentModifier {
  let modifier: number;
  let classification: string;

  if (fearGreedValue < 25) {
    modifier = 5;
    classification = 'Extreme Fear';
  } else if (fearGreedValue < 45) {
    modifier = 2;
    classification = 'Fear';
  } else if (fearGreedValue <= 55) {
    modifier = 0;
    classification = 'Neutral';
  } else if (fearGreedValue <= 75) {
    modifier = -2;
    classification = 'Greed';
  } else {
    modifier = -5;
    classification = 'Extreme Greed';
  }

  return { fearGreedValue, classification, modifier };
}

/**
 * Determine the signal type from a composite score (0-100).
 */
export function determineSignalType(score: number): SignalType {
  for (const [signalType, { min, max }] of Object.entries(SIGNAL_THRESHOLDS)) {
    if (score >= min && score < max) {
      return signalType as SignalType;
    }
  }
  // Score of exactly 100 is strong_buy
  if (score >= 100) return 'strong_buy';
  return 'hold';
}

/**
 * Detect cross-confirmation when RSI and MACD agree on direction.
 * Both bullish: confirmed buy with 73-77% historical win rate.
 * Both bearish: confirmed sell with 73-77% historical win rate.
 */
export function detectCrossConfirmation(
  rsiResult: RSIResult,
  macdResult: MACDResult,
): CrossConfirmation {
  const rsiBullish = rsiResult.signal === 'buy';
  const rsiBearish = rsiResult.signal === 'sell';
  const macdBullish = macdResult.signal === 'buy';
  const macdBearish = macdResult.signal === 'sell';

  if (rsiBullish && macdBullish) {
    return {
      isConfirmed: true,
      direction: 'buy',
      confidence: '73-77% historical win rate',
    };
  }

  if (rsiBearish && macdBearish) {
    return {
      isConfirmed: true,
      direction: 'sell',
      confidence: '73-77% historical win rate',
    };
  }

  return {
    isConfirmed: false,
    direction: 'none',
    confidence: 'No cross-confirmation',
  };
}
