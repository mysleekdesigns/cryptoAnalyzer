"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMarketStore } from "@/lib/store/market-store";
import type { AssetType, MarketData } from "@/types/market";

interface UseMarketDataOptions {
  assetType: AssetType;
  symbol?: string;
  pollInterval?: number; // ms, default 60000
}

interface UseMarketDataReturn {
  data: MarketData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMarketData({
  assetType,
  symbol,
  pollInterval = 60_000,
}: UseMarketDataOptions): UseMarketDataReturn {
  const { marketData, isLoading, error, setMarketData, setLoading, setError } =
    useMarketStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint =
        assetType === "crypto" ? "/api/crypto" : "/api/stocks";
      const url = symbol ? `${endpoint}/${symbol}` : endpoint;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch market data: ${res.status}`);
      }

      const data: MarketData = await res.json();
      setMarketData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [assetType, symbol, setMarketData, setLoading, setError]);

  useEffect(() => {
    fetchData();

    if (pollInterval > 0) {
      intervalRef.current = setInterval(fetchData, pollInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, pollInterval]);

  return { data: marketData, isLoading, error, refetch: fetchData };
}
