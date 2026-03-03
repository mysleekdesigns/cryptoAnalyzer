import type { OHLCVData } from '@/types/market';
import type {
  IndicatorWeights,
  BacktestResult,
  BacktestTrade,
  BacktestStats,
  SignalType,
} from '@/types/signals';
import { DEFAULT_WEIGHTS } from '@/types/signals';
import { generateSignal } from './signal-generator';

/**
 * Minimum data points needed to compute all indicators.
 * MA(200) needs 200 points; we use a 200-point lookback window.
 */
const MIN_LOOKBACK = 200;

/**
 * Run a backtest on historical OHLCV data using the composite signal engine.
 *
 * Pure function: no side effects, no API calls, fully deterministic.
 *
 * Strategy:
 * - Generate a composite signal at each data point using a trailing window
 * - Buy on BUY / STRONG_BUY when not in a position
 * - Sell on SELL / STRONG_SELL when in a position
 * - Track all trades, equity curve, and compute stats
 *
 * @param ohlcv         - Full OHLCV time series (sorted chronologically)
 * @param sentimentValue - Constant sentiment value to use (Fear & Greed index)
 * @param weights       - Optional custom indicator weights
 * @param symbol        - Asset symbol for labeling
 * @param assetType     - 'crypto' or 'stock'
 */
export function backtest(
  ohlcv: OHLCVData[],
  sentimentValue: number = 50,
  weights: IndicatorWeights = DEFAULT_WEIGHTS,
  symbol = 'UNKNOWN',
  assetType: 'crypto' | 'stock' = 'crypto',
): BacktestResult {
  const sorted = [...ohlcv].sort((a, b) => a.time - b.time);

  if (sorted.length < MIN_LOOKBACK + 1) {
    return emptyResult(symbol, assetType, sorted, weights);
  }

  const trades: BacktestTrade[] = [];
  const equityCurve: { time: number; equity: number }[] = [];
  const signalPoints: { time: number; score: number; signalType: SignalType }[] = [];

  let inPosition = false;
  let entryPrice = 0;
  let entryTime = 0;
  let entrySignalType: SignalType = 'hold';
  let equity = 100; // Start with $100 notional

  // Iterate from the first point where we have enough lookback data
  for (let i = MIN_LOOKBACK; i < sorted.length; i++) {
    const window = sorted.slice(i - MIN_LOOKBACK, i + 1);
    const currentBar = sorted[i];

    const signal = generateSignal(
      window,
      sentimentValue,
      weights,
      symbol,
      assetType,
    );

    signalPoints.push({
      time: currentBar.time,
      score: signal.compositeScore,
      signalType: signal.signalType,
    });

    if (!inPosition) {
      // Look for buy signals
      if (signal.signalType === 'buy' || signal.signalType === 'strong_buy') {
        inPosition = true;
        entryPrice = currentBar.close;
        entryTime = currentBar.time;
        entrySignalType = signal.signalType;
      }
    } else {
      // Look for sell signals
      if (signal.signalType === 'sell' || signal.signalType === 'strong_sell') {
        const exitPrice = currentBar.close;
        const returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
        const pnl = exitPrice - entryPrice;

        trades.push({
          entryTime,
          entryPrice,
          entrySignal: entrySignalType,
          exitTime: currentBar.time,
          exitPrice,
          exitSignal: signal.signalType,
          holdDuration: currentBar.time - entryTime,
          returnPct,
          pnl,
        });

        // Update equity
        equity *= 1 + returnPct / 100;
        inPosition = false;
      }
    }

    equityCurve.push({ time: currentBar.time, equity });
  }

  // Close any open position at the last bar
  if (inPosition && sorted.length > 0) {
    const lastBar = sorted[sorted.length - 1];
    const returnPct = ((lastBar.close - entryPrice) / entryPrice) * 100;
    const pnl = lastBar.close - entryPrice;

    trades.push({
      entryTime,
      entryPrice,
      entrySignal: entrySignalType,
      exitTime: lastBar.time,
      exitPrice: lastBar.close,
      exitSignal: 'hold', // forced close
      holdDuration: lastBar.time - entryTime,
      returnPct,
      pnl,
    });

    equity *= 1 + returnPct / 100;
    equityCurve[equityCurve.length - 1] = {
      time: lastBar.time,
      equity,
    };
  }

  const stats = calculateStats(trades, equityCurve);

  return {
    symbol,
    assetType,
    dateRange: {
      from: sorted[MIN_LOOKBACK].time,
      to: sorted[sorted.length - 1].time,
    },
    weights,
    stats,
    trades,
    equityCurve,
    signals: signalPoints,
  };
}

/**
 * Calculate performance statistics from a list of trades.
 */
function calculateStats(
  trades: BacktestTrade[],
  equityCurve: { time: number; equity: number }[],
): BacktestStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      avgGainPct: 0,
      avgLossPct: 0,
      totalReturnPct: 0,
      maxDrawdownPct: 0,
      sharpeRatio: 0,
      profitFactor: 0,
      bestTradePct: 0,
      worstTradePct: 0,
      avgHoldDuration: 0,
    };
  }

  const winners = trades.filter((t) => t.returnPct > 0);
  const losers = trades.filter((t) => t.returnPct <= 0);

  const winningTrades = winners.length;
  const losingTrades = losers.length;
  const winRate = winningTrades / trades.length;

  const avgGainPct =
    winners.length > 0
      ? winners.reduce((sum, t) => sum + t.returnPct, 0) / winners.length
      : 0;

  const avgLossPct =
    losers.length > 0
      ? losers.reduce((sum, t) => sum + t.returnPct, 0) / losers.length
      : 0;

  const grossProfit = winners.reduce((sum, t) => sum + t.returnPct, 0);
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.returnPct, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const lastEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : 100;
  const totalReturnPct = ((lastEquity - 100) / 100) * 100;

  // Max drawdown
  let peak = 0;
  let maxDrawdownPct = 0;
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const drawdown = ((peak - point.equity) / peak) * 100;
    if (drawdown > maxDrawdownPct) maxDrawdownPct = drawdown;
  }

  // Sharpe ratio (annualized, assuming ~252 trading days)
  const returns = trades.map((t) => t.returnPct / 100);
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  const bestTradePct = Math.max(...trades.map((t) => t.returnPct));
  const worstTradePct = Math.min(...trades.map((t) => t.returnPct));

  const avgHoldDuration =
    trades.reduce((sum, t) => sum + t.holdDuration, 0) / trades.length;

  return {
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    winRate,
    avgGainPct,
    avgLossPct,
    totalReturnPct,
    maxDrawdownPct,
    sharpeRatio,
    profitFactor: profitFactor === Infinity ? 999.99 : profitFactor,
    bestTradePct,
    worstTradePct,
    avgHoldDuration,
  };
}

function emptyResult(
  symbol: string,
  assetType: 'crypto' | 'stock',
  sorted: OHLCVData[],
  weights: IndicatorWeights,
): BacktestResult {
  return {
    symbol,
    assetType,
    dateRange: {
      from: sorted[0]?.time ?? 0,
      to: sorted[sorted.length - 1]?.time ?? 0,
    },
    weights,
    stats: {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      avgGainPct: 0,
      avgLossPct: 0,
      totalReturnPct: 0,
      maxDrawdownPct: 0,
      sharpeRatio: 0,
      profitFactor: 0,
      bestTradePct: 0,
      worstTradePct: 0,
      avgHoldDuration: 0,
    },
    trades: [],
    equityCurve: [],
    signals: [],
  };
}
