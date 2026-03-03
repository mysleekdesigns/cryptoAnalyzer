'use client';

import { cn } from '@/lib/utils/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { IndicatorResult } from '@/types/signals';

const INDICATOR_LABELS: Record<string, string> = {
  rsi: 'RSI',
  macd: 'MACD',
  bollinger_bands: 'Bollinger Bands',
  moving_averages: 'Moving Averages',
  volume: 'Volume',
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-strong-buy';
  if (score >= 60) return 'bg-buy';
  if (score >= 40) return 'bg-hold';
  if (score >= 20) return 'bg-sell';
  return 'bg-strong-sell';
}

function getSignalBadge(signal: 'buy' | 'sell' | 'neutral') {
  switch (signal) {
    case 'buy':
      return { label: 'Buy', className: 'bg-buy-muted text-buy' };
    case 'sell':
      return { label: 'Sell', className: 'bg-sell-muted text-sell' };
    case 'neutral':
      return { label: 'Neutral', className: 'bg-muted text-muted-foreground' };
  }
}

interface IndicatorPanelProps {
  indicators: IndicatorResult[];
}

export function IndicatorPanel({ indicators }: IndicatorPanelProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Technical Indicators
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {indicators.map((indicator) => {
          const badge = getSignalBadge(indicator.signal);
          return (
            <div
              key={indicator.type}
              className="rounded-lg border border-border/40 bg-background/50 p-3"
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {INDICATOR_LABELS[indicator.type] ?? indicator.type}
                </span>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-[10px]', badge.className)}>{badge.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {(indicator.weight * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Score bar */}
              <div className="mt-2 flex items-center gap-3">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                      getScoreColor(indicator.score)
                    )}
                    style={{ width: `${Math.max(2, indicator.score)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-semibold tabular-nums text-foreground">
                  {Math.round(indicator.score)}
                </span>
              </div>

              {/* Details */}
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {indicator.details}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
