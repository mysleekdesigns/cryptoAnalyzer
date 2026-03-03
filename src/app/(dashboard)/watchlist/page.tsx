"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils/index";
import {
  formatCurrency,
  formatPercent,
  formatSignalScore,
  formatDate,
} from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { AssetType, CoinGeckoMarketResponse } from "@/types/market";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface WatchlistDbItem {
  id: string;
  userId: string;
  symbol: string;
  assetType: AssetType;
  addedAt: string;
}

interface WatchlistRow extends WatchlistDbItem {
  name?: string;
  image?: string;
  currentPrice?: number;
  priceChangePercent24h?: number;
  volume24h?: number;
  marketCap?: number;
  signalScore?: number;
  signalLabel?: string;
  signalColorClass?: string;
  signalBgClass?: string;
}

interface SearchResult {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  image?: string;
  currentPrice?: number;
}

// ─── Icons ──────────────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn("size-4", className)}
    >
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn("size-4", className)}
    >
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn("size-4", className)}
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022 1.005 11.36A2.75 2.75 0 0 0 7.76 20h4.48a2.75 2.75 0 0 0 2.742-2.689l1.004-11.36.15.022a.75.75 0 1 0 .228-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .7.8l-.5 5.5a.75.75 0 0 1-1.5-.136l.5-5.5a.75.75 0 0 1 .8-.664Zm2.84 0a.75.75 0 0 1 .8.664l.5 5.5a.75.75 0 1 1-1.5.136l-.5-5.5a.75.75 0 0 1 .7-.8Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn("size-4", className)}
    >
      <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" />
    </svg>
  );
}

function Loader2Icon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 animate-spin", className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ─── Score bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const { colorClass } = formatSignalScore(score);
  const barColor = colorClass.replace("text-", "bg-");
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn("text-sm font-mono tabular-nums", colorClass)}>
        {score}
      </span>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [marketData, setMarketData] = useState<CoinGeckoMarketResponse[]>([]);

  // Fetch market data for enriching watchlist items
  const fetchMarketData = useCallback(async () => {
    try {
      const res = await fetch("/api/crypto?per_page=250");
      if (!res.ok) return;
      const data = await res.json();
      setMarketData(data.markets ?? []);
      return data.markets ?? [];
    } catch {
      return [];
    }
  }, []);

  // Enrich watchlist items with market data
  const enrichWatchlist = useCallback(
    (items: WatchlistDbItem[], markets: CoinGeckoMarketResponse[]) => {
      return items.map((item): WatchlistRow => {
        const match = markets.find(
          (m) => m.symbol.toLowerCase() === item.symbol.toLowerCase()
        );
        if (match) {
          return {
            ...item,
            name: match.name,
            image: match.image,
            currentPrice: match.current_price,
            priceChangePercent24h: match.price_change_percentage_24h,
            volume24h: match.total_volume,
            marketCap: match.market_cap,
          };
        }
        return item;
      });
    },
    []
  );

  // Fetch watchlist from API
  const fetchWatchlist = useCallback(async () => {
    setIsLoading(true);
    try {
      const [watchlistRes, markets] = await Promise.all([
        fetch("/api/watchlist"),
        fetchMarketData(),
      ]);

      if (!watchlistRes.ok) throw new Error("Failed to fetch watchlist");
      const data = await watchlistRes.json();
      const enriched = enrichWatchlist(data.items ?? [], markets ?? []);
      setWatchlist(enriched);
    } catch {
      toast.error("Failed to load watchlist");
    } finally {
      setIsLoading(false);
    }
  }, [fetchMarketData, enrichWatchlist]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Search available assets
  const filteredSearch = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const watchlistSymbols = new Set(
      watchlist.map((w) => w.symbol.toLowerCase())
    );
    return marketData
      .filter(
        (m) =>
          (m.symbol.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q)) &&
          !watchlistSymbols.has(m.symbol.toLowerCase())
      )
      .slice(0, 8)
      .map(
        (m): SearchResult => ({
          id: m.id,
          symbol: m.symbol,
          name: m.name,
          assetType: "crypto",
          image: m.image,
          currentPrice: m.current_price,
        })
      );
  }, [searchQuery, marketData, watchlist]);

  // Add to watchlist
  const handleAdd = async (result: SearchResult) => {
    setAddingSymbol(result.symbol);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: result.symbol,
          assetType: result.assetType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add");
      }

      const data = await res.json();
      const match = marketData.find(
        (m) => m.symbol.toLowerCase() === result.symbol.toLowerCase()
      );
      const enrichedItem: WatchlistRow = {
        ...data.item,
        name: match?.name ?? result.name,
        image: match?.image ?? result.image,
        currentPrice: match?.current_price ?? result.currentPrice,
        priceChangePercent24h: match?.price_change_percentage_24h,
        volume24h: match?.total_volume,
        marketCap: match?.market_cap,
      };
      setWatchlist((prev) => [...prev, enrichedItem]);
      setSearchQuery("");
      toast.success(`${result.symbol.toUpperCase()} added to watchlist`);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to add asset";
      toast.error(msg);
    } finally {
      setAddingSymbol(null);
    }
  };

  // Remove from watchlist
  const handleRemove = async (id: string, symbol: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");

      setWatchlist((prev) => prev.filter((item) => item.id !== id));
      toast.success(`${symbol.toUpperCase()} removed from watchlist`);
    } catch {
      toast.error("Failed to remove asset");
    } finally {
      setRemovingId(null);
    }
  };

  // Bulk signal analysis
  const handleAnalyzeAll = async () => {
    if (watchlist.length === 0) return;
    setIsAnalyzing(true);

    try {
      const results = await Promise.allSettled(
        watchlist.map((item) =>
          fetch(`/api/signals/${item.assetType}/${item.symbol}`).then((res) =>
            res.json()
          )
        )
      );

      let successCount = 0;
      let failCount = 0;

      const updated = watchlist.map((item, i): WatchlistRow => {
        const result = results[i];
        if (result.status === "fulfilled" && result.value?.signal?.compositeScore != null) {
          const score = Math.round(result.value.signal.compositeScore);
          const signal = formatSignalScore(score);
          successCount++;
          return {
            ...item,
            signalScore: score,
            signalLabel: signal.label,
            signalColorClass: signal.colorClass,
            signalBgClass: signal.bgClass,
          };
        }
        failCount++;
        return item;
      });

      setWatchlist(updated);

      if (successCount > 0) {
        toast.success(
          `Analyzed ${successCount} asset${successCount !== 1 ? "s" : ""}`
        );
      }
      if (failCount > 0) {
        toast.error(
          `Failed to analyze ${failCount} asset${failCount !== 1 ? "s" : ""}`
        );
      }
    } catch {
      toast.error("Failed to analyze signals");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your favorite assets and analyze signals
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleAnalyzeAll}
          disabled={isAnalyzing || watchlist.length === 0}
          className="gap-1.5"
        >
          {isAnalyzing ? (
            <Loader2Icon className="size-4" />
          ) : (
            <SparklesIcon className="size-4" />
          )}
          {isAnalyzing ? "Analyzing..." : "Analyze All Signals"}
        </Button>
      </div>

      {/* Search + Add */}
      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search assets to add..."
          aria-label="Search assets to add to watchlist"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {/* Search dropdown */}
        {searchQuery.trim() && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg" role="listbox" aria-label="Search results">
            {filteredSearch.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                No assets found
              </div>
            ) : (
              filteredSearch.map((result) => (
                <button
                  role="option"
                  aria-selected={false}
                  key={result.id}
                  onClick={() => handleAdd(result)}
                  disabled={addingSymbol === result.symbol}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  {result.image ? (
                    <Image
                      src={result.image}
                      alt={result.name}
                      width={24}
                      height={24}
                      className="rounded-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-6 rounded-full bg-secondary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">
                      {result.symbol.toUpperCase()}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground truncate">
                      {result.name}
                    </span>
                  </div>
                  {result.currentPrice != null && (
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">
                      {formatCurrency(result.currentPrice)}
                    </span>
                  )}
                  {addingSymbol === result.symbol ? (
                    <Loader2Icon className="size-4 shrink-0" />
                  ) : (
                    <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Watchlist count */}
      <p className="text-xs text-muted-foreground">
        {watchlist.length} asset{watchlist.length !== 1 ? "s" : ""} in watchlist
      </p>

      {/* Table */}
      {isLoading ? (
        <WatchlistSkeleton />
      ) : watchlist.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              Your watchlist is empty. Search for assets above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 table-scroll-mobile">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">24h Change</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.map((item) => {
                  const pctChange = item.priceChangePercent24h != null
                    ? formatPercent(item.priceChangePercent24h)
                    : null;

                  return (
                    <TableRow key={item.id} className="group">
                      {/* Asset name + symbol */}
                      <TableCell>
                        <Link
                          href={`/assets/${item.assetType}/${item.symbol}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name ?? item.symbol}
                              width={24}
                              height={24}
                              className="rounded-full"
                              loading="lazy"
                            />
                          ) : (
                            <div className="size-6 rounded-full bg-secondary" />
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold">
                              {item.symbol.toUpperCase()}
                            </span>
                            {item.name && (
                              <span className="ml-1.5 text-xs text-muted-foreground truncate">
                                {item.name}
                              </span>
                            )}
                          </div>
                        </Link>
                      </TableCell>

                      {/* Asset type */}
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {item.assetType}
                        </Badge>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="text-right font-mono tabular-nums text-sm">
                        {item.currentPrice != null
                          ? formatCurrency(item.currentPrice)
                          : "--"}
                      </TableCell>

                      {/* 24h change */}
                      <TableCell className="text-right">
                        {pctChange ? (
                          <span
                            className={cn(
                              "text-sm font-mono tabular-nums",
                              pctChange.colorClass
                            )}
                          >
                            {pctChange.text}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            --
                          </span>
                        )}
                      </TableCell>

                      {/* Signal */}
                      <TableCell>
                        {item.signalScore != null ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              className={cn(
                                "text-[10px] font-semibold border-0",
                                item.signalBgClass,
                                item.signalColorClass
                              )}
                            >
                              {item.signalLabel}
                            </Badge>
                            <ScoreBar score={item.signalScore} />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            --
                          </span>
                        )}
                      </TableCell>

                      {/* Added date */}
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(new Date(item.addedAt))}
                      </TableCell>

                      {/* Remove */}
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove ${item.symbol.toUpperCase()} from watchlist`}
                                className="size-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                onClick={() =>
                                  handleRemove(item.id, item.symbol)
                                }
                                disabled={removingId === item.id}
                              >
                                {removingId === item.id ? (
                                  <Loader2Icon className="size-4" />
                                ) : (
                                  <TrashIcon className="size-4 text-muted-foreground hover:text-destructive" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove from watchlist</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Loading skeleton ───────────────────────────────────────────────────────────

function WatchlistSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="space-y-0 divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3"
            >
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-14" />
              <Skeleton className="ml-auto h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
