import type { AssetType } from './market';

export type SignalType = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

export type IndicatorType = 'rsi' | 'macd' | 'bollinger_bands' | 'moving_averages' | 'volume';

// Individual indicator result
export interface IndicatorResult {
  type: IndicatorType;
  score: number; // 0-100 (0 = strong sell, 50 = neutral, 100 = strong buy)
  weight: number; // 0-1, configured weight
  rawValue: number | Record<string, number>; // Raw indicator value(s)
  signal: 'buy' | 'sell' | 'neutral';
  details: string; // Human-readable explanation
}

// RSI specific
export interface RSIResult extends IndicatorResult {
  type: 'rsi';
  rawValue: number; // RSI value 0-100
}

// MACD specific
export interface MACDResult extends IndicatorResult {
  type: 'macd';
  rawValue: {
    macd: number;
    signal: number;
    histogram: number;
  };
}

// Bollinger Bands specific
export interface BollingerBandsResult extends IndicatorResult {
  type: 'bollinger_bands';
  rawValue: {
    upper: number;
    middle: number;
    lower: number;
    percentB: number; // Price position within bands (0-1)
  };
}

// Moving Averages specific
export interface MovingAveragesResult extends IndicatorResult {
  type: 'moving_averages';
  rawValue: {
    sma50: number;
    sma200: number;
    distance: number; // Percentage distance between SMAs
  };
}

// Volume specific
export interface VolumeResult extends IndicatorResult {
  type: 'volume';
  rawValue: {
    currentVolume: number;
    averageVolume: number;
    ratio: number; // currentVolume / averageVolume
  };
}

// Configurable indicator weights (must sum to 1.0)
export interface IndicatorWeights {
  rsi: number;       // default: 0.20
  macd: number;      // default: 0.25
  bollinger_bands: number; // default: 0.15
  moving_averages: number; // default: 0.25
  volume: number;    // default: 0.15
}

export const DEFAULT_WEIGHTS: IndicatorWeights = {
  rsi: 0.20,
  macd: 0.25,
  bollinger_bands: 0.15,
  moving_averages: 0.25,
  volume: 0.15,
};

// Sentiment modifier
export interface SentimentModifier {
  fearGreedValue: number; // 0-100
  classification: string;
  modifier: number; // -5 to +5
}

// Cross confirmation (MACD + RSI agreement)
export interface CrossConfirmation {
  isConfirmed: boolean;
  direction: 'buy' | 'sell' | 'none';
  confidence: string; // "73-77% historical win rate"
}

// Full composite signal
export interface CompositeSignal {
  symbol: string;
  assetType: AssetType;
  compositeScore: number; // 0-100 (after sentiment modifier, clamped)
  rawScore: number; // Before sentiment modifier
  signalType: SignalType;
  indicators: IndicatorResult[];
  sentiment: SentimentModifier;
  crossConfirmation: CrossConfirmation;
  weights: IndicatorWeights;
  generatedAt: number; // Unix timestamp
}

// Signal display helpers
export interface SignalDisplay {
  label: string;
  color: string; // CSS color variable name
  bgColor: string; // Muted background
}

export const SIGNAL_THRESHOLDS: Record<SignalType, { min: number; max: number }> = {
  strong_sell: { min: 0, max: 20 },
  sell: { min: 20, max: 40 },
  hold: { min: 40, max: 60 },
  buy: { min: 60, max: 80 },
  strong_buy: { min: 80, max: 100 },
};

// Weight presets
export const WEIGHT_PRESETS: Record<string, IndicatorWeights> = {
  default: DEFAULT_WEIGHTS,
  conservative: { rsi: 0.25, macd: 0.20, bollinger_bands: 0.20, moving_averages: 0.25, volume: 0.10 },
  aggressive: { rsi: 0.15, macd: 0.30, bollinger_bands: 0.10, moving_averages: 0.30, volume: 0.15 },
  momentum: { rsi: 0.15, macd: 0.35, bollinger_bands: 0.10, moving_averages: 0.20, volume: 0.20 },
  mean_reversion: { rsi: 0.30, macd: 0.15, bollinger_bands: 0.25, moving_averages: 0.15, volume: 0.15 },
};

// --- Backtesting types ---

export interface BacktestTrade {
  entryTime: number;     // Unix timestamp
  entryPrice: number;
  entrySignal: SignalType;
  exitTime: number;      // Unix timestamp
  exitPrice: number;
  exitSignal: SignalType;
  holdDuration: number;  // milliseconds
  returnPct: number;     // percentage gain/loss
  pnl: number;           // absolute profit/loss
}

export interface BacktestStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;           // 0-1
  avgGainPct: number;        // average winning trade %
  avgLossPct: number;        // average losing trade %
  totalReturnPct: number;    // cumulative return %
  maxDrawdownPct: number;    // worst peak-to-trough %
  sharpeRatio: number;       // risk-adjusted return
  profitFactor: number;      // gross profit / gross loss
  bestTradePct: number;
  worstTradePct: number;
  avgHoldDuration: number;   // milliseconds
}

export interface BacktestResult {
  symbol: string;
  assetType: 'crypto' | 'stock';
  dateRange: { from: number; to: number };
  weights: IndicatorWeights;
  stats: BacktestStats;
  trades: BacktestTrade[];
  equityCurve: { time: number; equity: number }[];
  signals: { time: number; score: number; signalType: SignalType }[];
}
