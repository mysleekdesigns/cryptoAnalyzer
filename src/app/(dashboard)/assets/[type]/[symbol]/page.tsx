'use client';

import { useEffect, useState, use } from 'react';
import { cn } from '@/lib/utils/index';
import { formatCurrency, formatPercent, formatLargeNumber, formatDate } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CompositeScore } from '@/components/analysis/composite-score';
import { IndicatorPanel } from '@/components/analysis/indicator-panel';
import { SignalHistory } from '@/components/analysis/signal-history';
import type { Asset, OHLCVData, TimeRange } from '@/types/market';
import type { CompositeSignal, SignalType } from '@/types/signals';
import { AISummaryCard } from '@/components/analysis/ai-summary-card';
import { BacktestPanel } from '@/components/analysis/backtest-results';
import dynamic from 'next/dynamic';

const CandlestickChart = dynamic(
  () =>
    import('@/components/charts/candlestick-chart').then((mod) => mod.CandlestickChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/50 bg-background/50">
        <p className="text-sm text-muted-foreground">Loading chart...</p>
      </div>
    ),
  }
);

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ type: string; symbol: string }>;
}) {
  const { type, symbol } = use(params);
  const assetType = type as 'crypto' | 'stock';

  const [asset, setAsset] = useState<Asset | null>(null);
  const [signal, setSignal] = useState<CompositeSignal | null>(null);
  const [signalHistoryData, setSignalHistoryData] = useState<
    { symbol: string; signalType: SignalType; compositeScore: number; timestamp: number }[]
  >([]);
  const [chartData, setChartData] = useState<OHLCVData[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const assetUrl =
          assetType === 'crypto'
            ? `/api/crypto/${symbol}`
            : `/api/stocks/${symbol}`;

        const [assetRes, signalRes, historyRes] = await Promise.allSettled([
          fetch(assetUrl),
          fetch(`/api/signals/${assetType}/${symbol}`),
          fetch(`/api/signals/history?symbol=${symbol}&assetType=${assetType}&limit=20`),
        ]);

        if (assetRes.status === 'fulfilled' && assetRes.value.ok) {
          const data = await assetRes.value.json();
          setAsset(data);
          // Extract OHLCV chart data if present
          if (data.ohlcv) {
            setChartData(data.ohlcv);
          }
        } else {
          setError('Failed to load asset data');
        }

        if (signalRes.status === 'fulfilled' && signalRes.value.ok) {
          const data = await signalRes.value.json();
          setSignal(data);
        }

        if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
          const data = await historyRes.value.json();
          setSignalHistoryData(
            (data.data ?? []).map((row: { symbol: string; signalType: string; compositeScore: number; createdAt: string }) => ({
              symbol: row.symbol,
              signalType: row.signalType as SignalType,
              compositeScore: row.compositeScore,
              timestamp: new Date(row.createdAt).getTime(),
            })),
          );
        }
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [assetType, symbol]);

  if (loading) {
    return <AssetDetailSkeleton />;
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-sm text-muted-foreground">{error ?? 'Asset not found'}</p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const priceChange = formatPercent(asset.priceChangePercent24h);

  return (
    <div className="space-y-6">
      {/* Asset Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          {asset.image && (
            <img
              src={asset.image}
              alt={asset.name}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
              <Badge variant="outline" className="text-xs uppercase">
                {asset.symbol}
              </Badge>
              <Badge variant="secondary" className="text-xs uppercase">
                {assetType}
              </Badge>
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl font-bold tabular-nums">
                {formatCurrency(asset.currentPrice)}
              </span>
              <span className={cn('text-sm font-medium', priceChange.colorClass)}>
                {priceChange.text}
              </span>
              {asset.priceChange24h !== undefined && (
                <span className={cn('text-sm tabular-nums', priceChange.colorClass)}>
                  ({formatCurrency(Math.abs(asset.priceChange24h))})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Market stats */}
        <div className="flex flex-wrap gap-4 sm:gap-6 text-xs text-muted-foreground">
          {asset.marketCap != null && (
            <div>
              <p className="font-medium">Market Cap</p>
              <p className="text-sm tabular-nums text-foreground">
                ${formatLargeNumber(asset.marketCap)}
              </p>
            </div>
          )}
          {asset.volume24h != null && (
            <div>
              <p className="font-medium">24h Volume</p>
              <p className="text-sm tabular-nums text-foreground">
                ${formatLargeNumber(asset.volume24h)}
              </p>
            </div>
          )}
          {asset.high24h != null && asset.low24h != null && (
            <div>
              <p className="font-medium">24h Range</p>
              <p className="text-sm tabular-nums text-foreground">
                {formatCurrency(asset.low24h)} - {formatCurrency(asset.high24h)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div className="rounded-xl border border-border/50 bg-card p-2 sm:p-4">
        <CandlestickChart
          data={chartData}
          activeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          height={300}
        />
      </div>

      {/* Analysis Section: Composite Score + Indicator Panel */}
      {signal ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
          <CompositeScore signal={signal} />
          <IndicatorPanel indicators={signal.indicators} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/50 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Signal analysis not available for this asset
          </p>
        </div>
      )}

      {/* Signal History */}
      {signalHistoryData.length > 0 && (
        <SignalHistory
          signals={signalHistoryData}
          priceData={chartData.map((d) => ({ time: d.time, value: d.close }))}
        />
      )}

      {/* Backtesting */}
      <BacktestPanel symbol={symbol} assetType={assetType} />

      {/* AI Analysis Summary */}
      <AISummaryCard symbol={symbol} assetType={assetType} />

      {/* Signal metadata */}
      {signal && (
        <p className="text-xs text-muted-foreground">
          Signal generated {formatDate(signal.generatedAt)}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Add to Watchlist
        </Button>
        <Button variant="outline" className="gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Add to Portfolio
        </Button>
      </div>
    </div>
  );
}

function AssetDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </div>
  );
}
