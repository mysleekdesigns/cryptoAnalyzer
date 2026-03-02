import { create } from "zustand";
import type { AssetType } from "@/types/market";
import type { CompositeSignal, SignalType } from "@/types/signals";

interface SignalFilters {
  assetType?: AssetType;
  signalType?: SignalType;
  dateRange?: [Date, Date];
}

interface SignalState {
  currentSignal: CompositeSignal | null;
  signalHistory: CompositeSignal[];
  isCalculating: boolean;
  filters: SignalFilters;
  setCurrentSignal: (signal: CompositeSignal) => void;
  addToHistory: (signal: CompositeSignal) => void;
  setCalculating: (calculating: boolean) => void;
  setFilters: (filters: SignalFilters) => void;
  clearSignal: () => void;
}

export const useSignalStore = create<SignalState>((set) => ({
  currentSignal: null,
  signalHistory: [],
  isCalculating: false,
  filters: {},
  setCurrentSignal: (signal) => set({ currentSignal: signal }),
  addToHistory: (signal) =>
    set((state) => ({ signalHistory: [...state.signalHistory, signal] })),
  setCalculating: (calculating) => set({ isCalculating: calculating }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  clearSignal: () => set({ currentSignal: null }),
}));
