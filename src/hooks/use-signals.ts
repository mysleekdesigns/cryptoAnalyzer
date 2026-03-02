"use client";

import { useCallback } from "react";
import { useSignalStore } from "@/lib/store/signal-store";
import type { AssetType } from "@/types/market";
import type { CompositeSignal } from "@/types/signals";

interface UseSignalsOptions {
  assetType: AssetType;
  symbol: string;
}

interface UseSignalsReturn {
  signal: CompositeSignal | null;
  isCalculating: boolean;
  error: string | null;
  calculate: () => Promise<void>;
}

export function useSignals({
  assetType,
  symbol,
}: UseSignalsOptions): UseSignalsReturn {
  const {
    currentSignal,
    isCalculating,
    setCurrentSignal,
    addToHistory,
    setCalculating,
  } = useSignalStore();

  const calculate = useCallback(async () => {
    setCalculating(true);

    try {
      const res = await fetch(`/api/signals/${assetType}/${symbol}`);

      if (!res.ok) {
        throw new Error(`Signal calculation failed: ${res.status}`);
      }

      const signal: CompositeSignal = await res.json();
      setCurrentSignal(signal);
      addToHistory(signal);
    } catch (err) {
      // Error is stored via the store pattern; we re-throw for callers
      throw err;
    } finally {
      setCalculating(false);
    }
  }, [assetType, symbol, setCurrentSignal, addToHistory, setCalculating]);

  return {
    signal: currentSignal,
    isCalculating,
    error: null,
    calculate,
  };
}
