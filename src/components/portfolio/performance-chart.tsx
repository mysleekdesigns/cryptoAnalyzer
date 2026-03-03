"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils/formatters";

interface PerformanceDataPoint {
  date: string;
  value: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        Not enough data for performance chart
      </div>
    );
  }

  const isPositive = data.length >= 2 && data[data.length - 1].value >= data[0].value;
  const strokeColor = isPositive ? "hsl(var(--chart-up))" : "hsl(var(--chart-down))";
  const fillId = isPositive ? "fillPositive" : "fillNegative";

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="fillPositive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-up))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(var(--chart-up))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillNegative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-down))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(var(--chart-down))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          width={80}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                <p className="text-muted-foreground">{label}</p>
                <p className="font-medium font-mono">{formatCurrency(payload[0].value as number)}</p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          fill={`url(#${fillId})`}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
