'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/index';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { BacktestResult, IndicatorWeights } from '@/types/signals';
import { DEFAULT_WEIGHTS, WEIGHT_PRESETS } from '@/types/signals';
import type { AssetType } from '@/types/market';

interface BacktestPanelProps {
  symbol: string;
  assetType: AssetType;
}

export function BacktestPanel({ symbol, assetType }: BacktestPanelProps) {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [compareResult, setCompareResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('default');
  const [comparePreset, setComparePreset] = useState<string | null>(null);

  async function runBacktest(weights: IndicatorWeights, isCompare = false) {
    if (!isCompare) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, assetType, weights }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'Backtest failed');
      }

      const data: BacktestResult = await response.json();

      if (isCompare) {
        setCompareResult(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest failed');
    } finally {
      if (!isCompare) setLoading(false);
    }
  }

  function handleRunBacktest() {
    const weights = WEIGHT_PRESETS[selectedPreset] ?? DEFAULT_WEIGHTS;
    runBacktest(weights);
    setCompareResult(null);
    setComparePreset(null);
  }

  function handleCompare(preset: string) {
    setComparePreset(preset);
    const weights = WEIGHT_PRESETS[preset] ?? DEFAULT_WEIGHTS;
    runBacktest(weights, true);
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Backtesting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Strategy:</span>
          {Object.keys(WEIGHT_PRESETS).map((preset) => (
            <button
              key={preset}
              onClick={() => setSelectedPreset(preset)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded transition-colors capitalize',
                selectedPreset === preset
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
              )}
            >
              {preset.replace('_', ' ')}
            </button>
          ))}
        </div>

        <Button
          onClick={handleRunBacktest}
          disabled={loading}
          size="sm"
          className="w-full"
        >
          {loading ? 'Running Backtest...' : 'Run Backtest'}
        </Button>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {loading && <BacktestSkeleton />}

        {result && !loading && (
          <>
            <StatsCard
              result={result}
              label={selectedPreset}
              compareResult={compareResult}
              compareLabel={comparePreset}
            />

            <TradeList trades={result.trades} />

            {/* Compare section */}
            {!compareResult && (
              <div className="space-y-2 border-t border-border/50 pt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Compare with another strategy:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(WEIGHT_PRESETS)
                    .filter((p) => p !== selectedPreset)
                    .map((preset) => (
                      <Button
                        key={preset}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs capitalize"
                        onClick={() => handleCompare(preset)}
                      >
                        {preset.replace('_', ' ')}
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {compareResult && comparePreset && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setCompareResult(null);
                  setComparePreset(null);
                }}
              >
                Clear comparison
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatsCard({
  result,
  label,
  compareResult,
  compareLabel,
}: {
  result: BacktestResult;
  label: string;
  compareResult: BacktestResult | null;
  compareLabel: string | null;
}) {
  const { stats } = result;
  const cStats = compareResult?.stats;

  const rows: {
    key: string;
    label: string;
    value: string;
    compareValue?: string;
    colorFn?: (v: number) => string;
    rawValue: number;
    rawCompare?: number;
  }[] = [
    {
      key: 'totalReturn',
      label: 'Total Return',
      value: `${stats.totalReturnPct >= 0 ? '+' : ''}${stats.totalReturnPct.toFixed(2)}%`,
      compareValue: cStats ? `${cStats.totalReturnPct >= 0 ? '+' : ''}${cStats.totalReturnPct.toFixed(2)}%` : undefined,
      colorFn: (v) => (v > 0 ? 'text-chart-up' : v < 0 ? 'text-chart-down' : 'text-foreground'),
      rawValue: stats.totalReturnPct,
      rawCompare: cStats?.totalReturnPct,
    },
    {
      key: 'winRate',
      label: 'Win Rate',
      value: `${(stats.winRate * 100).toFixed(1)}%`,
      compareValue: cStats ? `${(cStats.winRate * 100).toFixed(1)}%` : undefined,
      rawValue: stats.winRate,
      rawCompare: cStats?.winRate,
    },
    {
      key: 'totalTrades',
      label: 'Total Trades',
      value: String(stats.totalTrades),
      compareValue: cStats ? String(cStats.totalTrades) : undefined,
      rawValue: stats.totalTrades,
      rawCompare: cStats?.totalTrades,
    },
    {
      key: 'profitFactor',
      label: 'Profit Factor',
      value: stats.profitFactor.toFixed(2),
      compareValue: cStats ? cStats.profitFactor.toFixed(2) : undefined,
      rawValue: stats.profitFactor,
      rawCompare: cStats?.profitFactor,
    },
    {
      key: 'maxDrawdown',
      label: 'Max Drawdown',
      value: `-${stats.maxDrawdownPct.toFixed(2)}%`,
      compareValue: cStats ? `-${cStats.maxDrawdownPct.toFixed(2)}%` : undefined,
      colorFn: () => 'text-chart-down',
      rawValue: stats.maxDrawdownPct,
      rawCompare: cStats?.maxDrawdownPct,
    },
    {
      key: 'sharpe',
      label: 'Sharpe Ratio',
      value: stats.sharpeRatio.toFixed(2),
      compareValue: cStats ? cStats.sharpeRatio.toFixed(2) : undefined,
      rawValue: stats.sharpeRatio,
      rawCompare: cStats?.sharpeRatio,
    },
    {
      key: 'avgGain',
      label: 'Avg Win',
      value: `+${stats.avgGainPct.toFixed(2)}%`,
      compareValue: cStats ? `+${cStats.avgGainPct.toFixed(2)}%` : undefined,
      rawValue: stats.avgGainPct,
      rawCompare: cStats?.avgGainPct,
    },
    {
      key: 'avgLoss',
      label: 'Avg Loss',
      value: `${stats.avgLossPct.toFixed(2)}%`,
      compareValue: cStats ? `${cStats.avgLossPct.toFixed(2)}%` : undefined,
      rawValue: stats.avgLossPct,
      rawCompare: cStats?.avgLossPct,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs capitalize">
          {label.replace('_', ' ')}
        </Badge>
        {compareLabel && (
          <>
            <span className="text-xs text-muted-foreground">vs</span>
            <Badge variant="outline" className="text-xs capitalize">
              {compareLabel.replace('_', ' ')}
            </Badge>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{row.label}</span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'tabular-nums font-medium',
                  row.colorFn ? row.colorFn(row.rawValue) : 'text-foreground',
                )}
              >
                {row.value}
              </span>
              {row.compareValue && (
                <span
                  className={cn(
                    'tabular-nums text-muted-foreground',
                    row.colorFn && row.rawCompare !== undefined
                      ? row.colorFn(row.rawCompare)
                      : '',
                  )}
                >
                  / {row.compareValue}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border/30 pt-2 text-xs">
        <span className="text-muted-foreground">Best Trade</span>
        <span className="tabular-nums text-chart-up font-medium">
          +{stats.bestTradePct.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Worst Trade</span>
        <span className="tabular-nums text-chart-down font-medium">
          {stats.worstTradePct.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function TradeList({ trades }: { trades: BacktestResult['trades'] }) {
  const [expanded, setExpanded] = useState(false);
  const displayTrades = expanded ? trades : trades.slice(0, 5);

  if (trades.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No trades generated in this period
      </p>
    );
  }

  return (
    <div className="space-y-1.5 border-t border-border/50 pt-3">
      <p className="text-xs font-medium text-muted-foreground">
        Trades ({trades.length})
      </p>
      <div className="max-h-60 overflow-y-auto space-y-1">
        {displayTrades.map((trade, i) => {
          const isWin = trade.returnPct > 0;
          return (
            <div
              key={`${trade.entryTime}-${i}`}
              className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-secondary/30"
            >
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 text-[10px]',
                    isWin ? 'border-chart-up/30 text-chart-up' : 'border-chart-down/30 text-chart-down',
                  )}
                >
                  {isWin ? 'WIN' : 'LOSS'}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(trade.entryTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' - '}
                  {new Date(trade.exitTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <span
                className={cn(
                  'tabular-nums font-medium',
                  isWin ? 'text-chart-up' : 'text-chart-down',
                )}
              >
                {trade.returnPct >= 0 ? '+' : ''}
                {trade.returnPct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
      {trades.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : `Show all ${trades.length} trades`}
        </Button>
      )}
    </div>
  );
}

function BacktestSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
