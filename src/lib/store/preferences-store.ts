import { create } from "zustand";
import type { IndicatorWeights } from "@/types/signals";
import { DEFAULT_WEIGHTS, WEIGHT_PRESETS } from "@/types/signals";

export type PresetName = "default" | "conservative" | "aggressive" | "momentum" | "mean_reversion" | "custom";

interface PreferencesState {
  weights: IndicatorWeights;
  activePreset: PresetName;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  setWeights: (weights: IndicatorWeights) => void;
  setWeight: (key: keyof IndicatorWeights, value: number) => void;
  applyPreset: (preset: PresetName) => void;
  fetchPreferences: () => Promise<void>;
  savePreferences: () => Promise<boolean>;
}

function detectPreset(weights: IndicatorWeights): PresetName {
  for (const [name, preset] of Object.entries(WEIGHT_PRESETS)) {
    const match = Object.keys(preset).every(
      (k) =>
        Math.abs(
          preset[k as keyof IndicatorWeights] -
            weights[k as keyof IndicatorWeights]
        ) < 0.001
    );
    if (match) return name as PresetName;
  }
  return "custom";
}

export function getWeightSum(weights: IndicatorWeights): number {
  return Object.values(weights).reduce((sum, w) => sum + w, 0);
}

export function isValidWeightSum(weights: IndicatorWeights): boolean {
  return Math.abs(getWeightSum(weights) - 1.0) < 0.001;
}

export function isCustomWeights(weights: IndicatorWeights): boolean {
  return detectPreset(weights) !== "default";
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  weights: { ...DEFAULT_WEIGHTS },
  activePreset: "default",
  isLoading: false,
  isSaving: false,
  error: null,

  setWeights: (weights) =>
    set({ weights, activePreset: detectPreset(weights) }),

  setWeight: (key, value) => {
    const weights = { ...get().weights, [key]: value };
    set({ weights, activePreset: detectPreset(weights) });
  },

  applyPreset: (preset) => {
    if (preset === "custom") return;
    const weights = WEIGHT_PRESETS[preset];
    if (weights) {
      set({ weights: { ...weights }, activePreset: preset });
    }
  },

  fetchPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/preferences");
      if (!res.ok) throw new Error("Failed to fetch preferences");
      const data = await res.json();
      if (data.preferences?.indicatorWeights) {
        const weights = data.preferences.indicatorWeights as IndicatorWeights;
        set({
          weights,
          activePreset: detectPreset(weights),
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch preferences",
        isLoading: false,
      });
    }
  },

  savePreferences: async () => {
    const { weights } = get();
    if (!isValidWeightSum(weights)) return false;

    set({ isSaving: true, error: null });
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indicatorWeights: weights }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save preferences");
      }
      set({ isSaving: false });
      return true;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to save preferences",
        isSaving: false,
      });
      return false;
    }
  },
}));
