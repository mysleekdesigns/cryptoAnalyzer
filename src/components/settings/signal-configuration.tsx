"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { SaveIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePreferencesStore,
  getWeightSum,
  isValidWeightSum,
  type PresetName,
} from "@/lib/store/preferences-store";
import type { IndicatorWeights } from "@/types/signals";

const INDICATOR_LABELS: Record<keyof IndicatorWeights, { label: string; description: string }> = {
  rsi: { label: "RSI", description: "Relative Strength Index (14)" },
  macd: { label: "MACD", description: "Moving Average Convergence Divergence" },
  bollinger_bands: { label: "Bollinger Bands", description: "Bollinger Bands (20, 2)" },
  moving_averages: { label: "Moving Averages", description: "SMA 50/200 crossover" },
  volume: { label: "Volume", description: "Volume ratio analysis" },
};

const PRESETS: { name: PresetName; label: string; description: string }[] = [
  { name: "default", label: "Default", description: "Balanced across all indicators" },
  { name: "conservative", label: "Conservative", description: "Higher MA and BB weight" },
  { name: "aggressive", label: "Aggressive", description: "Higher MACD and RSI weight" },
  { name: "momentum", label: "Momentum", description: "Higher MACD and Volume weight" },
  { name: "mean_reversion", label: "Mean Reversion", description: "Higher RSI and BB weight" },
];

function WeightBar({ weights }: { weights: IndicatorWeights }) {
  const colors: Record<keyof IndicatorWeights, string> = {
    rsi: "bg-blue-500",
    macd: "bg-emerald-500",
    bollinger_bands: "bg-amber-500",
    moving_averages: "bg-purple-500",
    volume: "bg-rose-500",
  };

  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {(Object.keys(INDICATOR_LABELS) as (keyof IndicatorWeights)[]).map((key) => (
          <div
            key={key}
            className={`${colors[key]} transition-all duration-200`}
            style={{ width: `${weights[key] * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(INDICATOR_LABELS) as (keyof IndicatorWeights)[]).map((key) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`size-2 rounded-full ${colors[key]}`} />
            <span>{INDICATOR_LABELS[key].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SignalConfiguration() {
  const {
    weights,
    activePreset,
    isLoading,
    isSaving,
    error,
    setWeight,
    applyPreset,
    fetchPreferences,
    savePreferences,
  } = usePreferencesStore();

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const sum = getWeightSum(weights);
  const valid = isValidWeightSum(weights);

  const handleSave = async () => {
    const success = await savePreferences();
    if (success) {
      toast.success("Signal weights saved");
    } else {
      toast.error("Failed to save weights");
    }
  };

  const handleReset = () => {
    applyPreset("default");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Signal Configuration</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust indicator weights for composite score calculation
          </p>
        </div>
        {activePreset !== "default" && (
          <Badge variant="secondary">
            {activePreset === "custom" ? "Custom" : PRESETS.find((p) => p.name === activePreset)?.label}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            {/* Presets */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Presets</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={activePreset === preset.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyPreset(preset.name)}
                    title={preset.description}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Weight distribution bar */}
            <WeightBar weights={weights} />

            {/* Individual weight sliders */}
            <div className="space-y-5">
              {(Object.keys(INDICATOR_LABELS) as (keyof IndicatorWeights)[]).map((key) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{INDICATOR_LABELS[key].label}</p>
                      <p className="text-xs text-muted-foreground">
                        {INDICATOR_LABELS[key].description}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {(weights[key] * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[weights[key] * 100]}
                    min={0}
                    max={50}
                    step={5}
                    onValueChange={([v]) => setWeight(key, v / 100)}
                  />
                </div>
              ))}
            </div>

            {/* Sum validation */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Total Weight</span>
              <span
                className={`font-mono text-sm font-medium tabular-nums ${
                  valid ? "text-emerald-500" : "text-destructive"
                }`}
              >
                {(sum * 100).toFixed(0)}%
                {!valid && (
                  <span className="ml-2 text-xs">
                    (must equal 100%)
                  </span>
                )}
              </span>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!valid || isSaving}
              >
                <SaveIcon className="mr-2 size-4" />
                {isSaving ? "Saving..." : "Save Weights"}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcwIcon className="mr-2 size-4" />
                Reset to Default
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
