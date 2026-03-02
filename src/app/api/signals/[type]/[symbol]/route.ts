import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMarketChart } from '@/lib/api/coingecko';
import { getCandles } from '@/lib/api/finnhub';
import { getFearGreedIndex } from '@/lib/api/sentiment';
import { generateSignal } from '@/lib/engine/signal-generator';
import type { OHLCVData, AssetType } from '@/types/market';
import type { IndicatorWeights } from '@/types/signals';
import { DEFAULT_WEIGHTS, WEIGHT_PRESETS } from '@/types/signals';

async function fetchCryptoOHLCV(coinId: string, days: number): Promise<OHLCVData[]> {
  const response = await getMarketChart(coinId, 'usd', days);
  const chart = response.data;

  // CoinGecko chart data is arrays of [timestamp, value]
  // We need to merge prices and volumes into OHLCV format
  // CoinGecko doesn't provide true OHLCV, so we approximate using price as close
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; symbol: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, symbol } = await params;

    if (type !== 'crypto' && type !== 'stock') {
      return NextResponse.json(
        { error: 'Invalid type. Use "crypto" or "stock".' },
        { status: 400 },
      );
    }

    const assetType: AssetType = type;
    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '365', 10), 30), 730);
    const preset = searchParams.get('preset');

    let weights: IndicatorWeights = DEFAULT_WEIGHTS;
    if (preset && preset in WEIGHT_PRESETS) {
      weights = WEIGHT_PRESETS[preset];
    }

    // Fetch OHLCV data and sentiment in parallel
    const [ohlcv, sentimentResponse] = await Promise.all([
      assetType === 'crypto'
        ? fetchCryptoOHLCV(symbol, days)
        : fetchStockOHLCV(symbol.toUpperCase(), days),
      getFearGreedIndex(),
    ]);

    if (ohlcv.length < 30) {
      return NextResponse.json(
        { error: `Insufficient data: got ${ohlcv.length} data points, need at least 30` },
        { status: 422 },
      );
    }

    const signal = generateSignal(
      ohlcv,
      sentimentResponse.data.value,
      weights,
      symbol,
      assetType,
    );

    return NextResponse.json({
      signal,
      dataPoints: ohlcv.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate signal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
