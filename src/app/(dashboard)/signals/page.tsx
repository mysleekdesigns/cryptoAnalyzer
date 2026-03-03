"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/index";
import { formatSignalScore, formatDate } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { SignalType, CompositeSignal } from "@/types/signals";
import type { AssetType } from "@/types/market";

// -- Mock data ----------------------------------------------------------------

const MOCK_SIGNALS: CompositeSignal[] = [
  { symbol: "BTC", assetType: "crypto", compositeScore: 82, rawScore: 80, signalType: "strong_buy", indicators: [], sentiment: { fearGreedValue: 72, classification: "Greed", modifier: 2 }, crossConfirmation: { isConfirmed: true, direction: "buy", confidence: "77% historical win rate" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 120_000 },
  { symbol: "ETH", assetType: "crypto", compositeScore: 71, rawScore: 69, signalType: "buy", indicators: [], sentiment: { fearGreedValue: 72, classification: "Greed", modifier: 2 }, crossConfirmation: { isConfirmed: true, direction: "buy", confidence: "73% historical win rate" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 300_000 },
  { symbol: "SOL", assetType: "crypto", compositeScore: 88, rawScore: 85, signalType: "strong_buy", indicators: [], sentiment: { fearGreedValue: 72, classification: "Greed", modifier: 3 }, crossConfirmation: { isConfirmed: true, direction: "buy", confidence: "77% historical win rate" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 600_000 },
  { symbol: "ADA", assetType: "crypto", compositeScore: 45, rawScore: 47, signalType: "hold", indicators: [], sentiment: { fearGreedValue: 72, classification: "Greed", modifier: -2 }, crossConfirmation: { isConfirmed: false, direction: "none", confidence: "" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 900_000 },
  { symbol: "DOGE", assetType: "crypto", compositeScore: 32, rawScore: 34, signalType: "sell", indicators: [], sentiment: { fearGreedValue: 72, classification: "Greed", modifier: -2 }, crossConfirmation: { isConfirmed: false, direction: "sell", confidence: "" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 1_200_000 },
  { symbol: "XRP", assetType: "crypto", compositeScore: 63, rawScore: 61, signalType: "buy", indicators: [], sentiment: { fearGreedValue: 72, classification: "Greed", modifier: 2 }, crossConfirmation: { isConfirmed: false, direction: "buy", confidence: "" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 1_800_000 },
  { symbol: "AVAX", assetType: "crypto", compositeScore: 15, rawScore: 18, signalType: "strong_sell", indicators: [], sentiment: { fearGreedValue: 72, classification: "Greed", modifier: -3 }, crossConfirmation: { isConfirmed: true, direction: "sell", confidence: "75% historical win rate" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 2_400_000 },
  { symbol: "AAPL", assetType: "stock", compositeScore: 74, rawScore: 72, signalType: "buy", indicators: [], sentiment: { fearGreedValue: 65, classification: "Greed", modifier: 2 }, crossConfirmation: { isConfirmed: true, direction: "buy", confidence: "74% historical win rate" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 3_600_000 },
  { symbol: "TSLA", assetType: "stock", compositeScore: 28, rawScore: 30, signalType: "sell", indicators: [], sentiment: { fearGreedValue: 65, classification: "Greed", modifier: -2 }, crossConfirmation: { isConfirmed: true, direction: "sell", confidence: "73% historical win rate" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 4_200_000 },
  { symbol: "NVDA", assetType: "stock", compositeScore: 85, rawScore: 83, signalType: "strong_buy", indicators: [], sentiment: { fearGreedValue: 65, classification: "Greed", modifier: 2 }, crossConfirmation: { isConfirmed: true, direction: "buy", confidence: "76% historical win rate" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 5_400_000 },
  { symbol: "MSFT", assetType: "stock", compositeScore: 52, rawScore: 53, signalType: "hold", indicators: [], sentiment: { fearGreedValue: 65, classification: "Greed", modifier: -1 }, crossConfirmation: { isConfirmed: false, direction: "none", confidence: "" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 7_200_000 },
  { symbol: "AMZN", assetType: "stock", compositeScore: 67, rawScore: 65, signalType: "buy", indicators: [], sentiment: { fearGreedValue: 65, classification: "Greed", modifier: 2 }, crossConfirmation: { isConfirmed: false, direction: "buy", confidence: "" }, weights: { rsi: 0.2, macd: 0.25, bollinger_bands: 0.15, moving_averages: 0.25, volume: 0.15 }, generatedAt: Date.now() - 9_000_000 },
];

// -- Helpers ------------------------------------------------------------------

type SortKey = "score" | "date" | "name";

const SIGNAL_FILTER_OPTIONS: { value: SignalType | "all"; label: string }[] = [
  { value: "all", label: "All Signals" },
  { value: "strong_buy", label: "Strong Buy" },
  { value: "buy", label: "Buy" },
  { value: "hold", label: "Hold" },
  { value: "sell", label: "Sell" },
  { value: "strong_sell", label: "Strong Sell" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "Score (High to Low)" },
  { value: "date", label: "Date (Newest)" },
  { value: "name", label: "Name (A-Z)" },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cn("size-4", className)}>
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cn("size-4", className)}>
      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

function ArrowUpDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cn("size-4", className)}>
      <path fillRule="evenodd" d="M2.24 6.8a.75.75 0 0 0 1.06-.04l1.95-2.1v8.59a.75.75 0 0 0 1.5 0V4.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0L2.2 5.74a.75.75 0 0 0 .04 1.06Zm8 6.4a.75.75 0 0 0-.04 1.06l3.25 3.5a.75.75 0 0 0 1.1 0l3.25-3.5a.75.75 0 1 0-1.1-1.02l-1.95 2.1V6.75a.75.75 0 0 0-1.5 0v8.59l-1.95-2.1a.75.75 0 0 0-1.06-.04Z" clipRule="evenodd" />
    </svg>
  );
}

// -- Score bar ----------------------------------------------------------------

function ScoreBar({ score }: { score: number }) {
  const { colorClass } = formatSignalScore(score);
  const barColor = colorClass.replace("text-", "bg-");
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("text-sm font-mono tabular-nums", colorClass)}>{score}</span>
    </div>
  );
}

// -- Loading skeleton ---------------------------------------------------------

function SignalsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border border-border/50 bg-card/50 px-4 py-3">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="ml-auto h-5 w-16" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

// -- Main page ----------------------------------------------------------------

export default function SignalsPage() {
  const [isLoading] = useState(false);
  const [signalFilter, setSignalFilter] = useState<SignalType | "all">("all");
  const [assetFilter, setAssetFilter] = useState<AssetType | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("score");

  const filteredSignals = useMemo(() => {
    let result = [...MOCK_SIGNALS];

    if (signalFilter !== "all") {
      result = result.filter((s) => s.signalType === signalFilter);
    }
    if (assetFilter !== "all") {
      result = result.filter((s) => s.assetType === assetFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "score":
          return b.compositeScore - a.compositeScore;
        case "date":
          return b.generatedAt - a.generatedAt;
        case "name":
          return a.symbol.localeCompare(b.symbol);
        default:
          return 0;
      }
    });

    return result;
  }, [signalFilter, assetFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Signals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Composite buy/sell signals across crypto and stock assets
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Asset type tabs */}
        <Tabs
          value={assetFilter}
          onValueChange={(v) => setAssetFilter(v as AssetType | "all")}
        >
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
            <TabsTrigger value="crypto" className="text-xs px-3">Crypto</TabsTrigger>
            <TabsTrigger value="stock" className="text-xs px-3">Stocks</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Signal type filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              {SIGNAL_FILTER_OPTIONS.find((o) => o.value === signalFilter)?.label}
              <ChevronDownIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SIGNAL_FILTER_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setSignalFilter(opt.value)}
                className={cn(signalFilter === opt.value && "font-medium")}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <ArrowUpDownIcon className="size-3.5" />
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={cn(sortBy === opt.value && "font-medium")}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Signal count */}
      <p className="text-xs text-muted-foreground">
        {filteredSignals.length} signal{filteredSignals.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      {isLoading ? (
        <SignalsTableSkeleton />
      ) : filteredSignals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No signals match the current filters.</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setSignalFilter("all");
                setAssetFilter("all");
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Latest Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_80px_100px_120px_80px_100px] items-center gap-2 border-b border-border/50 px-4 pb-2 text-xs font-medium text-muted-foreground">
              <span>Asset</span>
              <span>Type</span>
              <span>Signal</span>
              <span>Score</span>
              <span className="text-center">Confirmed</span>
              <span className="text-right">Time</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/30">
              {filteredSignals.map((signal) => {
                const score = formatSignalScore(signal.compositeScore);
                const assetPath =
                  signal.assetType === "crypto"
                    ? `/assets/crypto/${signal.symbol.toLowerCase()}`
                    : `/assets/stock/${signal.symbol.toLowerCase()}`;

                return (
                  <Link
                    key={`${signal.symbol}-${signal.generatedAt}`}
                    href={assetPath}
                    className="grid grid-cols-[1fr_80px_100px_120px_80px_100px] items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/30"
                  >
                    {/* Asset */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{signal.symbol}</span>
                    </div>

                    {/* Type badge */}
                    <div>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {signal.assetType}
                      </Badge>
                    </div>

                    {/* Signal badge */}
                    <div>
                      <Badge
                        className={cn(
                          "text-[10px] font-semibold border-0",
                          score.bgClass,
                          score.colorClass
                        )}
                      >
                        {score.label}
                      </Badge>
                    </div>

                    {/* Score bar */}
                    <ScoreBar score={signal.compositeScore} />

                    {/* Cross confirmed */}
                    <div className="flex justify-center">
                      {signal.crossConfirmation.isConfirmed ? (
                        <CheckIcon className="size-4 text-chart-up" />
                      ) : (
                        <span className="text-xs text-muted-foreground/40">--</span>
                      )}
                    </div>

                    {/* Time */}
                    <div className="text-right text-xs text-muted-foreground">
                      {formatDate(signal.generatedAt)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
