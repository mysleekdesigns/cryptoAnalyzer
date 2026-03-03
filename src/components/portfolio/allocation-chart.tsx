"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils/formatters";
import type { AllocationItem } from "@/types/portfolio";

const COLORS = [
  "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1",
];

interface AllocationChartProps {
  data: AllocationItem[];
}

export function AllocationChart({ data }: AllocationChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        No allocation data
      </div>
    );
  }

  const chartData = data.map((item, i) => ({
    ...item,
    color: item.color || COLORS[i % COLORS.length],
  }));

  return (
    <div className="flex flex-col items-center gap-4">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="symbol"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            strokeWidth={0}
          >
            {chartData.map((entry, i) => (
              <Cell key={entry.symbol} fill={entry.color || COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0].payload as AllocationItem & { color: string };
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                  <p className="font-medium">{item.symbol}</p>
                  <p className="text-muted-foreground">
                    {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {chartData.map((item) => (
          <div key={item.symbol} className="flex items-center gap-1.5 text-xs">
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">
              {item.symbol} ({item.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
