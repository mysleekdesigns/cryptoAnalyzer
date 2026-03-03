"use client";

import { cn } from "@/lib/utils/index";
import type { FearGreedData } from "@/types/market";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FearGreedWidgetProps {
  data: FearGreedData | null;
  isLoading: boolean;
}

function GaugeArc({ value }: { value: number }) {
  // Semicircular gauge: 0 at left (red), 50 at center (yellow), 100 at right (green)
  const size = 200;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;

  // Arc from 180deg (left) to 0deg (right) = pi to 0
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalArc = startAngle - endAngle;

  // Needle angle
  const needleAngle = startAngle - (value / 100) * totalArc;
  const needleLen = radius - 20;
  const needleX = cx + needleLen * Math.cos(needleAngle);
  const needleY = cy - needleLen * Math.sin(needleAngle);

  // Arc path endpoints
  const arcStartX = cx + radius * Math.cos(startAngle);
  const arcStartY = cy - radius * Math.sin(startAngle);
  const arcEndX = cx + radius * Math.cos(endAngle);
  const arcEndY = cy - radius * Math.sin(endAngle);

  return (
    <svg
      viewBox={`0 0 ${size} ${size / 2 + 30}`}
      className="w-full max-w-[220px] mx-auto"
    >
      <defs>
        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--color-strong-sell)" />
          <stop offset="25%" stopColor="var(--color-sell)" />
          <stop offset="50%" stopColor="var(--color-hold)" />
          <stop offset="75%" stopColor="var(--color-buy)" />
          <stop offset="100%" stopColor="var(--color-strong-buy)" />
        </linearGradient>
      </defs>

      {/* Background arc */}
      <path
        d={`M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 0 1 ${arcEndX} ${arcEndY}`}
        fill="none"
        stroke="var(--color-secondary)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Colored arc */}
      <path
        d={`M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 0 1 ${arcEndX} ${arcEndY}`}
        fill="none"
        stroke="url(#gaugeGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke="var(--color-foreground)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="4" fill="var(--color-foreground)" />
    </svg>
  );
}

function classificationColor(classification: string): string {
  const lower = classification.toLowerCase();
  if (lower.includes("extreme fear")) return "text-strong-sell";
  if (lower.includes("fear")) return "text-sell";
  if (lower.includes("neutral")) return "text-hold";
  if (lower.includes("extreme greed")) return "text-strong-buy";
  if (lower.includes("greed")) return "text-buy";
  return "text-muted-foreground";
}

export function FearGreedWidget({ data, isLoading }: FearGreedWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fear & Greed Index</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-[115px] w-[220px] rounded-t-full" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : data ? (
          <div className="flex flex-col items-center gap-1">
            <GaugeArc value={data.value} />
            <span className="text-3xl font-bold font-mono tabular-nums -mt-2">
              {data.value}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                classificationColor(data.valueClassification)
              )}
            >
              {data.valueClassification}
            </span>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sentiment data unavailable
          </p>
        )}
      </CardContent>
    </Card>
  );
}
