"use client";

import { useState } from "react";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/index";
import { formatCurrency, formatPercent, formatSignalScore } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Holding } from "@/types/portfolio";

type SortKey = "symbol" | "quantity" | "avgBuyPrice" | "currentPrice" | "currentValue" | "totalGainLossPercent";
type SortDir = "asc" | "desc";

interface HoldingsTableProps {
  holdings: Holding[];
  onDelete?: (id: string) => void;
}

export function HoldingsTable({ holdings, onDelete }: HoldingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("currentValue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...holdings].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    switch (sortKey) {
      case "symbol":
        aVal = a.symbol;
        bVal = b.symbol;
        break;
      case "quantity":
        aVal = a.quantity;
        bVal = b.quantity;
        break;
      case "avgBuyPrice":
        aVal = a.avgBuyPrice;
        bVal = b.avgBuyPrice;
        break;
      case "currentPrice":
        aVal = a.currentPrice ?? 0;
        bVal = b.currentPrice ?? 0;
        break;
      case "currentValue":
        aVal = a.currentValue ?? 0;
        bVal = b.currentValue ?? 0;
        break;
      case "totalGainLossPercent":
        aVal = a.totalGainLossPercent ?? 0;
        bVal = b.totalGainLossPercent ?? 0;
        break;
      default:
        return 0;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    return (
      <button
        onClick={() => toggleSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown className={cn("size-3", sortKey === field && "text-foreground")} />
      </button>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        No holdings yet. Add your first asset to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="pb-3 text-left font-medium">
              <SortHeader label="Asset" field="symbol" />
            </th>
            <th className="pb-3 text-right font-medium">
              <SortHeader label="Quantity" field="quantity" />
            </th>
            <th className="pb-3 text-right font-medium">
              <SortHeader label="Avg Price" field="avgBuyPrice" />
            </th>
            <th className="pb-3 text-right font-medium">
              <SortHeader label="Price" field="currentPrice" />
            </th>
            <th className="pb-3 text-right font-medium">
              <SortHeader label="Value" field="currentValue" />
            </th>
            <th className="pb-3 text-right font-medium">
              <SortHeader label="Gain/Loss" field="totalGainLossPercent" />
            </th>
            <th className="pb-3 text-center font-medium">Signal</th>
            {onDelete && <th className="pb-3 w-10" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((holding) => {
            const gl = holding.totalGainLoss ?? 0;
            const glPct = holding.totalGainLossPercent ?? 0;
            const pctFmt = formatPercent(glPct);
            const signal = holding.signal ? formatSignalScore(
              holding.signal === "strong_buy" ? 90 :
              holding.signal === "buy" ? 70 :
              holding.signal === "hold" ? 50 :
              holding.signal === "sell" ? 30 : 10
            ) : null;

            return (
              <tr key={holding.id} className="border-b last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="py-3 font-medium">{holding.symbol}</td>
                <td className="py-3 text-right font-mono tabular-nums">
                  {holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                </td>
                <td className="py-3 text-right font-mono tabular-nums">
                  {formatCurrency(holding.avgBuyPrice)}
                </td>
                <td className="py-3 text-right font-mono tabular-nums">
                  {holding.currentPrice != null ? formatCurrency(holding.currentPrice) : "--"}
                </td>
                <td className="py-3 text-right font-mono tabular-nums">
                  {holding.currentValue != null ? formatCurrency(holding.currentValue) : "--"}
                </td>
                <td className="py-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className={cn("font-mono tabular-nums", pctFmt.colorClass)}>
                      {formatCurrency(gl)}
                    </span>
                    <span className={cn("text-xs", pctFmt.colorClass)}>
                      {pctFmt.text}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-center">
                  {signal ? (
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px]", signal.colorClass, signal.bgClass)}
                    >
                      {signal.label}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </td>
                {onDelete && (
                  <td className="py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${holding.symbol} holding`}
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(holding.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
