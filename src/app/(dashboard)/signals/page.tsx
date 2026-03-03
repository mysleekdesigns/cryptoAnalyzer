"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { SignalType } from "@/types/signals";
import type { AssetType } from "@/types/market";

// -- Types --------------------------------------------------------------------

interface SignalHistoryRow {
  id: string;
  symbol: string;
  assetType: AssetType;
  signalType: SignalType;
  compositeScore: number;
  indicators: unknown;
  sentiment: unknown;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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
  const [signals, setSignals] = useState<SignalHistoryRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signalFilter, setSignalFilter] = useState<SignalType | "all">("all");
  const [assetFilter, setAssetFilter] = useState<AssetType | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [page, setPage] = useState(1);

  const fetchSignals = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (signalFilter !== "all") params.set("signalType", signalFilter);
      if (assetFilter !== "all") params.set("assetType", assetFilter);

      const res = await fetch(`/api/signals/history?${params}`);
      if (!res.ok) {
        setSignals([]);
        setPagination(null);
        return;
      }

      const json = await res.json();
      setSignals(json.data ?? []);
      setPagination(json.pagination ?? null);
    } catch {
      setSignals([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [signalFilter, assetFilter, page]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [signalFilter, assetFilter]);

  // Client-side sort (API already sorts by date desc, but user may want score/name)
  const sortedSignals = [...signals].sort((a, b) => {
    switch (sortBy) {
      case "score":
        return b.compositeScore - a.compositeScore;
      case "date":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "name":
        return a.symbol.localeCompare(b.symbol);
      default:
        return 0;
    }
  });

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
        {pagination
          ? `${pagination.total} signal${pagination.total !== 1 ? "s" : ""}`
          : `${sortedSignals.length} signal${sortedSignals.length !== 1 ? "s" : ""}`}
      </p>

      {/* Table */}
      {isLoading ? (
        <SignalsTableSkeleton />
      ) : sortedSignals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              {signalFilter !== "all" || assetFilter !== "all"
                ? "No signals match the current filters."
                : "No signal history yet. Generate signals from asset pages to build your history."}
            </p>
            {(signalFilter !== "all" || assetFilter !== "all") && (
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
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Signal History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {/* Column headers */}
            <div className="table-scroll-mobile">
              <div className="min-w-[500px]">
                <div className="grid grid-cols-[1fr_80px_100px_120px_100px] items-center gap-2 border-b border-border/50 px-4 pb-2 text-xs font-medium text-muted-foreground">
                  <span>Asset</span>
                  <span>Type</span>
                  <span>Signal</span>
                  <span>Score</span>
                  <span className="text-right">Time</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-border/30">
                  {sortedSignals.map((row) => {
                    const score = formatSignalScore(row.compositeScore);
                    const assetPath =
                      row.assetType === "crypto"
                        ? `/assets/crypto/${row.symbol.toLowerCase()}`
                        : `/assets/stock/${row.symbol.toLowerCase()}`;

                    return (
                      <Link
                        key={row.id}
                        href={assetPath}
                        className="grid grid-cols-[1fr_80px_100px_120px_100px] items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/30"
                      >
                    {/* Asset */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{row.symbol}</span>
                    </div>

                    {/* Type badge */}
                    <div>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {row.assetType}
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
                    <ScoreBar score={row.compositeScore} />

                    {/* Time */}
                    <div className="text-right text-xs text-muted-foreground">
                      {formatDate(new Date(row.createdAt))}
                    </div>
                  </Link>
                );
              })}
                </div>
              </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
