"use client";

import { useEffect, useState, useCallback } from "react";
import type { Asset, FearGreedData, CoinGeckoMarketResponse } from "@/types/market";
import type { CompositeSignal } from "@/types/signals";
import { MarketOverview } from "@/components/dashboard/market-overview";
import { TopMovers } from "@/components/dashboard/top-movers";
import { FearGreedWidget } from "@/components/dashboard/fear-greed-widget";
import { SignalCard } from "@/components/dashboard/signal-card";
import { WatchlistWidget } from "@/components/dashboard/watchlist-widget";

function mapCoinGeckoToAsset(coin: CoinGeckoMarketResponse): Asset & { sparkline: number[] } {
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    assetType: "crypto",
    image: coin.image,
    currentPrice: coin.current_price,
    priceChange24h: coin.price_change_24h,
    priceChangePercent24h: coin.price_change_percentage_24h,
    marketCap: coin.market_cap,
    volume24h: coin.total_volume,
    rank: coin.market_cap_rank,
    sparkline: coin.sparkline_in_7d?.price ?? [],
  };
}

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [isLoadingSentiment, setIsLoadingSentiment] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoadingMarket(true);
    setIsLoadingSentiment(true);

    const marketPromise = fetch("/api/crypto?per_page=50")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch market data");
        return res.json();
      })
      .then((data) => {
        const mapped = (data.markets ?? []).map(mapCoinGeckoToAsset);
        setAssets(mapped);
      })
      .catch(() => {
        setAssets([]);
      })
      .finally(() => setIsLoadingMarket(false));

    const sentimentPromise = fetch("/api/sentiment")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch sentiment");
        return res.json();
      })
      .then((data) => {
        setFearGreed(data.current ?? null);
      })
      .catch(() => {
        setFearGreed(null);
      })
      .finally(() => setIsLoadingSentiment(false));

    await Promise.all([marketPromise, sentimentPromise]);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Placeholder signals from top assets (until real signal API is integrated)
  const mockSignals: Pick<
    CompositeSignal,
    "symbol" | "assetType" | "compositeScore" | "signalType" | "crossConfirmation"
  >[] = assets.slice(0, 4).map((asset) => {
    // Derive a rough score from the 24h % change for demonstration
    const raw = Math.min(100, Math.max(0, 50 + asset.priceChangePercent24h * 3));
    const score = Math.round(raw);
    let signalType: CompositeSignal["signalType"] = "hold";
    if (score >= 80) signalType = "strong_buy";
    else if (score >= 60) signalType = "buy";
    else if (score >= 40) signalType = "hold";
    else if (score >= 20) signalType = "sell";
    else signalType = "strong_sell";

    return {
      symbol: asset.symbol,
      assetType: asset.assetType,
      compositeScore: score,
      signalType,
      crossConfirmation: {
        isConfirmed: score >= 70 || score <= 30,
        direction: score >= 50 ? "buy" as const : "sell" as const,
        confidence: "73-77% historical win rate",
      },
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Market overview and signal analysis
        </p>
      </div>

      {/* Market Overview - full width */}
      <MarketOverview assets={assets} isLoading={isLoadingMarket} />

      {/* Grid: Fear & Greed + Top Movers + Signals + Watchlist */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <FearGreedWidget data={fearGreed} isLoading={isLoadingSentiment} />
        <TopMovers assets={assets} isLoading={isLoadingMarket} />

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Signal Highlights
          </h2>
          {isLoadingMarket ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[72px] rounded-xl border bg-card animate-pulse"
                />
              ))}
            </div>
          ) : (
            mockSignals.map((signal) => (
              <SignalCard key={signal.symbol} signal={signal} />
            ))
          )}
        </div>
      </div>

      {/* Watchlist widget */}
      <div className="max-w-full sm:max-w-md">
        <WatchlistWidget items={[]} />
      </div>
    </div>
  );
}
