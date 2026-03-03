'use client';

import { cn } from '@/lib/utils/index';
import { formatSignalScore } from '@/lib/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CompositeSignal } from '@/types/signals';
import { DEFAULT_WEIGHTS } from '@/types/signals';
import { SlidersHorizontalIcon } from 'lucide-react';

const INDICATOR_LABELS: Record<string, string> = {
  rsi: 'RSI',
  macd: 'MACD',
  bollinger_bands: 'Bollinger Bands',
  moving_averages: 'Moving Averages',
  volume: 'Volume',
};

const SIGNAL_STROKE_COLORS: Record<string, string> = {
  strong_buy: '#22c55e',
  buy: '#4ade80',
  hold: '#eab308',
  sell: '#f97316',
  strong_sell: '#ef4444',
};

interface CompositeScoreProps {
  signal: CompositeSignal;
}

function hasCustomWeights(signal: CompositeSignal): boolean {
  if (!signal.weights) return false;
  return Object.keys(DEFAULT_WEIGHTS).some(
    (k) =>
      Math.abs(
        signal.weights[k as keyof typeof DEFAULT_WEIGHTS] -
          DEFAULT_WEIGHTS[k as keyof typeof DEFAULT_WEIGHTS]
      ) > 0.001
  );
}

export function CompositeScore({ signal }: CompositeScoreProps) {
  const { label, colorClass, bgClass } = formatSignalScore(signal.compositeScore);
  const strokeColor = SIGNAL_STROKE_COLORS[signal.signalType] ?? '#eab308';
  const isCustom = hasCustomWeights(signal);

  // SVG gauge params
  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Show 270 degrees of the circle (3/4 arc)
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const filledLength = arcLength * (signal.compositeScore / 100);
  const gapLength = circumference - arcLength;

  // Rotate so the arc starts at bottom-left and ends at bottom-right
  // The arc starts at the 3 o'clock position by default; rotate -225deg to start at bottom-left
  const rotation = -225;

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Composite Signal
          </CardTitle>
          {isCustom && (
            <Badge variant="outline" className="gap-1 text-xs">
              <SlidersHorizontalIcon className="size-3" />
              Custom
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {/* Circular Gauge */}
        <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Composite signal score: ${Math.round(signal.compositeScore)} out of 100, ${label}`}>
          <svg
            width={size}
            height={size}
            className="overflow-visible"
            style={{ transform: `rotate(${rotation}deg)` }}
            aria-hidden="true"
          >
            {/* Background arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-muted/30"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${gapLength}`}
              strokeLinecap="round"
            />
            {/* Filled arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${filledLength} ${circumference - filledLength}`}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-4xl font-bold tabular-nums', colorClass)}>
              {Math.round(signal.compositeScore)}
            </span>
            <span className={cn('text-xs font-semibold uppercase tracking-wider', colorClass)}>
              {label}
            </span>
          </div>
        </div>

        {/* Cross Confirmation */}
        <div className="flex items-center gap-2">
          {signal.crossConfirmation.isConfirmed ? (
            <Badge className={cn('gap-1', bgClass, colorClass)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Confirmed ({signal.crossConfirmation.direction})
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not Confirmed
            </Badge>
          )}
          {signal.crossConfirmation.confidence && (
            <span className="text-xs text-muted-foreground">
              {signal.crossConfirmation.confidence}
            </span>
          )}
        </div>

        {/* Sentiment modifier */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Sentiment: {signal.sentiment.classification}</span>
          <span
            className={cn(
              'font-medium',
              signal.sentiment.modifier > 0
                ? 'text-chart-up'
                : signal.sentiment.modifier < 0
                  ? 'text-chart-down'
                  : 'text-muted-foreground'
            )}
          >
            ({signal.sentiment.modifier > 0 ? '+' : ''}
            {signal.sentiment.modifier})
          </span>
        </div>

        {/* Weight Breakdown */}
        <div className="w-full space-y-1.5 border-t border-border/50 pt-3">
          <p className="text-xs font-medium text-muted-foreground">Weight Breakdown</p>
          {signal.indicators.map((ind) => {
            const weighted = ind.score * ind.weight;
            return (
              <div key={ind.type} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {INDICATOR_LABELS[ind.type] ?? ind.type}
                </span>
                <span className="tabular-nums text-foreground">
                  {ind.score.toFixed(0)} x {(ind.weight * 100).toFixed(0)}% ={' '}
                  {weighted.toFixed(1)}
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t border-border/30 pt-1.5 text-xs font-medium">
            <span className="text-muted-foreground">Raw Score</span>
            <span className="tabular-nums text-foreground">{signal.rawScore.toFixed(1)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
