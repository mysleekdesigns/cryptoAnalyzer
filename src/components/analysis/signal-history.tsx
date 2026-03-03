"use client";

import { cn } from "@/lib/utils/index";
import { formatSignalScore, formatDate } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SignalType } from "@/types/signals";

// -- Types --------------------------------------------------------------------

interface SignalEntry {
  symbol: string;
  signalType: SignalType;
  compositeScore: number;
  timestamp: number;
}

interface PricePoint {
  time: number;
  value: number;
}

interface SignalHistoryProps {
  signals: SignalEntry[];
  priceData?: PricePoint[];
}

// -- Border color map ---------------------------------------------------------

const BORDER_COLOR: Record<SignalType, string> = {
  strong_buy: "border-l-strong-buy",
  buy: "border-l-buy",
  hold: "border-l-hold",
  sell: "border-l-sell",
  strong_sell: "border-l-strong-sell",
};

// -- SVG chart with markers ---------------------------------------------------

function PriceChartWithSignals({
  priceData,
  signals,
}: {
  priceData: PricePoint[];
  signals: SignalEntry[];
}) {
  if (priceData.length === 0) return null;

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 16, bottom: 24, left: 16 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minTime = priceData[0].time;
  const maxTime = priceData[priceData.length - 1].time;
  const prices = priceData.map((p) => p.value);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const timeRange = maxTime - minTime || 1;

  function x(time: number) {
    return padding.left + ((time - minTime) / timeRange) * chartW;
  }
  function y(value: number) {
    return padding.top + chartH - ((value - minPrice) / priceRange) * chartH;
  }

  // Build polyline
  const points = priceData.map((p) => `${x(p.time)},${y(p.value)}`).join(" ");

  // Build gradient area path
  const areaPath = [
    `M ${x(priceData[0].time)},${y(priceData[0].value)}`,
    ...priceData.slice(1).map((p) => `L ${x(p.time)},${y(p.value)}`),
    `L ${x(priceData[priceData.length - 1].time)},${padding.top + chartH}`,
    `L ${x(priceData[0].time)},${padding.top + chartH} Z`,
  ].join(" ");

  // Map signals to chart coordinates (only those within the time range)
  const signalMarkers = signals
    .filter((s) => s.timestamp >= minTime && s.timestamp <= maxTime)
    .map((s) => {
      // Find closest price point
      let closest = priceData[0];
      let minDist = Math.abs(s.timestamp - closest.time);
      for (const p of priceData) {
        const dist = Math.abs(s.timestamp - p.time);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      }
      const isBuy = s.signalType === "buy" || s.signalType === "strong_buy";
      return { x: x(s.timestamp), y: y(closest.value), isBuy, score: s.compositeScore };
    });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={padding.left}
          y1={padding.top + chartH * (1 - frac)}
          x2={padding.left + chartW}
          y2={padding.top + chartH * (1 - frac)}
          stroke="currentColor"
          className="text-border/30"
          strokeWidth={0.5}
        />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#priceGradient)" />

      {/* Price line */}
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--chart-1))"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Signal markers */}
      {signalMarkers.map((m, i) =>
        m.isBuy ? (
          // Green triangle pointing up (buy)
          <polygon
            key={i}
            points={`${m.x},${m.y - 10} ${m.x - 6},${m.y + 2} ${m.x + 6},${m.y + 2}`}
            className="fill-strong-buy"
          />
        ) : (
          // Red triangle pointing down (sell)
          <polygon
            key={i}
            points={`${m.x},${m.y + 10} ${m.x - 6},${m.y - 2} ${m.x + 6},${m.y - 2}`}
            className="fill-strong-sell"
          />
        )
      )}
    </svg>
  );
}

// -- Timeline view (no price data) -------------------------------------------

function TimelineView({ signals }: { signals: SignalEntry[] }) {
  const sorted = [...signals].sort((a, b) => b.timestamp - a.timestamp);

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No signal history available.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((signal, i) => {
        const score = formatSignalScore(signal.compositeScore);
        return (
          <div
            key={`${signal.timestamp}-${i}`}
            className={cn(
              "flex items-center justify-between rounded-md border-l-2 bg-muted/20 px-3 py-2",
              BORDER_COLOR[signal.signalType]
            )}
          >
            <div className="flex items-center gap-3">
              <Badge
                className={cn(
                  "text-[10px] font-semibold border-0",
                  score.bgClass,
                  score.colorClass
                )}
              >
                {score.label}
              </Badge>
              <span className={cn("text-sm font-mono tabular-nums", score.colorClass)}>
                {signal.compositeScore}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDate(signal.timestamp, "long")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// -- Main component -----------------------------------------------------------

export function SignalHistory({ signals, priceData }: SignalHistoryProps) {
  const hasPrice = priceData && priceData.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Signal History</CardTitle>
      </CardHeader>
      <CardContent>
        {hasPrice ? (
          <div className="space-y-4">
            <PriceChartWithSignals priceData={priceData} signals={signals} />
            <TimelineView signals={signals} />
          </div>
        ) : (
          <TimelineView signals={signals} />
        )}
      </CardContent>
    </Card>
  );
}
