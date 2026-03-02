import type { OHLCVData } from '@/types/market';
import type {
  CompositeSignal,
  IndicatorWeights,
  IndicatorResult,
  RSIResult,
  MACDResult,
} from '@/types/signals';
import { DEFAULT_WEIGHTS } from '@/types/signals';
import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateMovingAverages,
  calculateVolumeSignal,
} from './indicators';
import {
  calculateCompositeScore,
  determineSignalType,
  detectCrossConfirmation,
} from './composite-score';

/**
 * Generate a full composite signal from OHLCV data and sentiment.
 *
 * Orchestrates: extract prices/volumes from OHLCV -> calculate all 5 indicators
 * -> compute composite score -> apply sentiment -> determine signal type
 * -> check cross-confirmation.
 *
 * Pure function: no side effects, no API calls.
 */
export function generateSignal(
  ohlcv: OHLCVData[],
  sentimentIndex: number,
  weights: IndicatorWeights = DEFAULT_WEIGHTS,
  symbol = 'UNKNOWN',
  assetType: 'crypto' | 'stock' = 'crypto',
): CompositeSignal {
  const prices = ohlcv.map(d => d.close);
  const volumes = ohlcv.map(d => d.volume);

  // Calculate all 5 indicators
  const rsiResult = calculateRSI(prices);
  const macdResult = calculateMACD(prices);
  const bbResult = calculateBollingerBands(prices);
  const maResult = calculateMovingAverages(prices);
  const volumeResult = calculateVolumeSignal(volumes, prices);

  // Assign weights to each indicator result
  const indicators: IndicatorResult[] = [
    { ...rsiResult, weight: weights.rsi },
    { ...macdResult, weight: weights.macd },
    { ...bbResult, weight: weights.bollinger_bands },
    { ...maResult, weight: weights.moving_averages },
    { ...volumeResult, weight: weights.volume },
  ];

  // Compute composite score with sentiment
  const { rawScore, compositeScore, sentiment } = calculateCompositeScore(
    indicators,
    weights,
    sentimentIndex,
  );

  // Determine signal type
  const signalType = determineSignalType(compositeScore);

  // Check cross-confirmation between RSI and MACD
  const crossConfirmation = detectCrossConfirmation(
    rsiResult as RSIResult,
    macdResult as MACDResult,
  );

  return {
    symbol,
    assetType,
    compositeScore,
    rawScore,
    signalType,
    indicators,
    sentiment,
    crossConfirmation,
    weights,
    generatedAt: Date.now(),
  };
}
