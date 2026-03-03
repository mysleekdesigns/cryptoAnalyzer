import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMarketChart } from '@/lib/api/coingecko';
import { getCandles } from '@/lib/api/finnhub';
import { getFearGreedIndex } from '@/lib/api/sentiment';
import { backtest } from '@/lib/engine/backtester';
import type { OHLCVData, AssetType } from '@/types/market';
import type { IndicatorWeights } from '@/types/signals';
import { DEFAULT_WEIGHTS } from '@/types/signals';

interface BacktestRequestBody {
  symbol: string;
  assetType: AssetType;
  dateRange?: { from: string; to: string };
  weights?: Partial<IndicatorWeights>;
}

async function fetchCryptoOHLCV(coinId: string, days: number): Promise<OHLCVData[]> {
  const response = await getMarketChart(coinId, 'usd', days);
  const chart = response.data;

  return chart.prices.map(([time, price], i) => ({
    time,
    open: price,
    high: price,
    low: price,
    close: price,
    volume: chart.total_volumes[i]?.[1] ?? 0,
  }));
}

async function fetchStockOHLCV(symbol: string, days: number): Promise<OHLCVData[]> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - days * 86400;
  const response = await getCandles(symbol, 'D', from, now);
  const candles = response.data;

  if (candles.s !== 'ok' || !candles.c?.length) {
    throw new Error(`No candle data available for ${symbol}`);
  }

  return candles.c.map((close, i) => ({
    time: candles.t[i] * 1000,
    open: candles.o[i],
    high: candles.h[i],
    low: candles.l[i],
    close,
    volume: candles.v[i],
  }));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: BacktestRequestBody = await request.json();

    if (!body.symbol || !body.assetType) {
      return NextResponse.json(
        { error: 'symbol and assetType are required' },
        { status: 400 },
      );
    }

    if (body.assetType !== 'crypto' && body.assetType !== 'stock') {
      return NextResponse.json(
        { error: 'assetType must be "crypto" or "stock"' },
        { status: 400 },
      );
    }

    // Calculate days from date range, default to 365
    let days = 365;
    if (body.dateRange?.from && body.dateRange?.to) {
      const fromMs = new Date(body.dateRange.from).getTime();
      const toMs = new Date(body.dateRange.to).getTime();
      if (!isNaN(fromMs) && !isNaN(toMs) && toMs > fromMs) {
        days = Math.ceil((toMs - fromMs) / 86400000);
      }
    }
    // Clamp to a reasonable range: 90-730 days
    days = Math.min(Math.max(days, 90), 730);

    // Merge custom weights with defaults
    const weights: IndicatorWeights = body.weights
      ? { ...DEFAULT_WEIGHTS, ...body.weights }
      : DEFAULT_WEIGHTS;

    // Validate weights sum close to 1.0
    const weightSum = Object.values(weights).reduce((s, w) => s + w, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      return NextResponse.json(
        { error: `Weights must sum to 1.0, got ${weightSum.toFixed(4)}` },
        { status: 400 },
      );
    }

    // Fetch data in parallel
    const [ohlcv, sentimentResponse] = await Promise.all([
      body.assetType === 'crypto'
        ? fetchCryptoOHLCV(body.symbol, days)
        : fetchStockOHLCV(body.symbol.toUpperCase(), days),
      getFearGreedIndex(),
    ]);

    if (ohlcv.length < 201) {
      return NextResponse.json(
        {
          error: `Insufficient data: got ${ohlcv.length} data points, need at least 201 for backtesting`,
        },
        { status: 422 },
      );
    }

    const result = backtest(
      ohlcv,
      sentimentResponse.data.value,
      weights,
      body.symbol,
      body.assetType,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to run backtest';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
