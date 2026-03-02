import { create } from "zustand";
import type { Asset, AssetType, MarketData } from "@/types/market";

interface MarketState {
  selectedAsset: Asset | null;
  selectedAssetType: AssetType;
  marketData: MarketData | null;
  trendingCoins: Asset[];
  isLoading: boolean;
  error: string | null;
  setSelectedAsset: (asset: Asset | null, type: AssetType) => void;
  setMarketData: (data: MarketData) => void;
  setTrendingCoins: (coins: Asset[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  selectedAsset: null,
  selectedAssetType: "crypto",
  marketData: null,
  trendingCoins: [],
  isLoading: false,
  error: null,
  setSelectedAsset: (asset, type) =>
    set({ selectedAsset: asset, selectedAssetType: type }),
  setMarketData: (data) => set({ marketData: data }),
  setTrendingCoins: (coins) => set({ trendingCoins: coins }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
