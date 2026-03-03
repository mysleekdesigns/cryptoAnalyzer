"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  LineSeries,
  HistogramSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { cn } from "@/lib/utils";

interface IndicatorData {
  sma50?: number[];
  sma200?: number[];
  bollingerUpper?: number[];
  bollingerLower?: number[];
  rsi?: number[];
  macd?: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  times: number[];
}

interface IndicatorOverlayProps {
  chart: IChartApi | null;
  indicators: IndicatorData;
  className?: string;
}

interface OverlaySeries {
  sma50: ISeriesApi<"Line"> | null;
  sma200: ISeriesApi<"Line"> | null;
  bbUpper: ISeriesApi<"Line"> | null;
  bbLower: ISeriesApi<"Line"> | null;
}

interface ToggleState {
  sma50: boolean;
  sma200: boolean;
  bollinger: boolean;
  rsi: boolean;
  macd: boolean;
}

const INDICATOR_LABELS: Record<keyof ToggleState, string> = {
  sma50: "SMA 50",
  sma200: "SMA 200",
  bollinger: "Bollinger",
  rsi: "RSI",
  macd: "MACD",
};

const SUB_CHART_HEIGHT = 120;

export function IndicatorOverlay({
  chart,
  indicators,
  className,
}: IndicatorOverlayProps) {
  const [toggles, setToggles] = useState<ToggleState>({
    sma50: false,
    sma200: false,
    bollinger: false,
    rsi: false,
    macd: false,
  });

  const overlaySeriesRef = useRef<OverlaySeries>({
    sma50: null,
    sma200: null,
    bbUpper: null,
    bbLower: null,
  });

  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const macdContainerRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const macdLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const buildTimeValues = useCallback(
    (values: number[]) => {
      return values.map((value, i) => ({
        time: indicators.times[i] as UTCTimestamp,
        value,
      }));
    },
    [indicators.times]
  );

  // Overlay series on the main chart (SMA, Bollinger)
  useEffect(() => {
    if (!chart) return;

    const series = overlaySeriesRef.current;

    // SMA 50
    if (toggles.sma50 && indicators.sma50) {
      if (!series.sma50) {
        series.sma50 = chart.addSeries(LineSeries, {
          color: "#3b82f6",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      series.sma50.setData(buildTimeValues(indicators.sma50));
    } else if (series.sma50) {
      chart.removeSeries(series.sma50);
      series.sma50 = null;
    }

    // SMA 200
    if (toggles.sma200 && indicators.sma200) {
      if (!series.sma200) {
        series.sma200 = chart.addSeries(LineSeries, {
          color: "#f97316",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      series.sma200.setData(buildTimeValues(indicators.sma200));
    } else if (series.sma200) {
      chart.removeSeries(series.sma200);
      series.sma200 = null;
    }

    // Bollinger Bands
    if (toggles.bollinger && indicators.bollingerUpper && indicators.bollingerLower) {
      if (!series.bbUpper) {
        series.bbUpper = chart.addSeries(LineSeries, {
          color: "#a1a1aa",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      if (!series.bbLower) {
        series.bbLower = chart.addSeries(LineSeries, {
          color: "#a1a1aa",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      series.bbUpper.setData(buildTimeValues(indicators.bollingerUpper));
      series.bbLower.setData(buildTimeValues(indicators.bollingerLower));
    } else {
      if (series.bbUpper) {
        chart.removeSeries(series.bbUpper);
        series.bbUpper = null;
      }
      if (series.bbLower) {
        chart.removeSeries(series.bbLower);
        series.bbLower = null;
      }
    }
  }, [chart, toggles.sma50, toggles.sma200, toggles.bollinger, indicators, buildTimeValues]);

  // RSI sub-chart
  useEffect(() => {
    const container = rsiContainerRef.current;

    if (!toggles.rsi || !indicators.rsi || !container) {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
      }
      return;
    }

    if (!rsiChartRef.current) {
      const rsiChart = createChart(container, {
        height: SUB_CHART_HEIGHT,
        layout: {
          background: { color: "transparent" },
          textColor: "#a1a1aa",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 10,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: "#27272a40" },
        },
        rightPriceScale: {
          borderColor: "#27272a",
          scaleMargins: { top: 0.05, bottom: 0.05 },
        },
        timeScale: {
          visible: false,
        },
        crosshair: {
          vertLine: { visible: false, labelVisible: false },
          horzLine: {
            color: "#a1a1aa50",
            style: LineStyle.Dashed,
            labelBackgroundColor: "#27272a",
          },
        },
      });

      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: "#a855f7",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
      });

      // Overbought/oversold reference lines
      const overbought = rsiChart.addSeries(LineSeries, {
        color: "#ef444460",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      const oversold = rsiChart.addSeries(LineSeries, {
        color: "#22c55e60",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      // Draw horizontal lines at 70 and 30
      const times = indicators.times;
      if (times.length >= 2) {
        const refPoints = [
          { time: times[0] as UTCTimestamp, value: 0 },
          { time: times[times.length - 1] as UTCTimestamp, value: 0 },
        ];
        overbought.setData(refPoints.map((p) => ({ ...p, value: 70 })));
        oversold.setData(refPoints.map((p) => ({ ...p, value: 30 })));
      }

      rsiChartRef.current = rsiChart;
      rsiSeriesRef.current = rsiSeries;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          if (width > 0) rsiChart.applyOptions({ width });
        }
      });
      resizeObserver.observe(container);

      // Store observer for cleanup
      (container as HTMLDivElement & { _ro?: ResizeObserver })._ro = resizeObserver;
    }

    if (rsiSeriesRef.current) {
      rsiSeriesRef.current.setData(buildTimeValues(indicators.rsi));
      rsiChartRef.current?.timeScale().fitContent();
    }

    return () => {
      const ro = (container as HTMLDivElement & { _ro?: ResizeObserver })._ro;
      if (ro) {
        ro.disconnect();
        delete (container as HTMLDivElement & { _ro?: ResizeObserver })._ro;
      }
    };
  }, [toggles.rsi, indicators, buildTimeValues]);

  // MACD sub-chart
  useEffect(() => {
    const container = macdContainerRef.current;

    if (!toggles.macd || !indicators.macd || !container) {
      if (macdChartRef.current) {
        macdChartRef.current.remove();
        macdChartRef.current = null;
        macdLineRef.current = null;
        macdSignalRef.current = null;
        macdHistRef.current = null;
      }
      return;
    }

    if (!macdChartRef.current) {
      const macdChart = createChart(container, {
        height: SUB_CHART_HEIGHT,
        layout: {
          background: { color: "transparent" },
          textColor: "#a1a1aa",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 10,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: "#27272a40" },
        },
        rightPriceScale: {
          borderColor: "#27272a",
        },
        timeScale: {
          visible: false,
        },
        crosshair: {
          vertLine: { visible: false, labelVisible: false },
          horzLine: {
            color: "#a1a1aa50",
            style: LineStyle.Dashed,
            labelBackgroundColor: "#27272a",
          },
        },
      });

      const macdLine = macdChart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
      });

      const signalLine = macdChart.addSeries(LineSeries, {
        color: "#f97316",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      const histogram = macdChart.addSeries(HistogramSeries, {
        priceLineVisible: false,
        lastValueVisible: false,
      });

      macdChartRef.current = macdChart;
      macdLineRef.current = macdLine;
      macdSignalRef.current = signalLine;
      macdHistRef.current = histogram;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          if (width > 0) macdChart.applyOptions({ width });
        }
      });
      resizeObserver.observe(container);
      (container as HTMLDivElement & { _ro?: ResizeObserver })._ro = resizeObserver;
    }

    if (macdLineRef.current && macdSignalRef.current && macdHistRef.current) {
      macdLineRef.current.setData(buildTimeValues(indicators.macd.macd));
      macdSignalRef.current.setData(buildTimeValues(indicators.macd.signal));
      macdHistRef.current.setData(
        indicators.macd.histogram.map((value, i) => ({
          time: indicators.times[i] as UTCTimestamp,
          value,
          color: value >= 0 ? "#22c55e80" : "#ef444480",
        }))
      );
      macdChartRef.current?.timeScale().fitContent();
    }

    return () => {
      const ro = (container as HTMLDivElement & { _ro?: ResizeObserver })._ro;
      if (ro) {
        ro.disconnect();
        delete (container as HTMLDivElement & { _ro?: ResizeObserver })._ro;
      }
    };
  }, [toggles.macd, indicators, buildTimeValues]);

  // Cleanup overlay series on unmount
  useEffect(() => {
    return () => {
      if (chart) {
        const series = overlaySeriesRef.current;
        if (series.sma50) chart.removeSeries(series.sma50);
        if (series.sma200) chart.removeSeries(series.sma200);
        if (series.bbUpper) chart.removeSeries(series.bbUpper);
        if (series.bbLower) chart.removeSeries(series.bbLower);
      }
      rsiChartRef.current?.remove();
      macdChartRef.current?.remove();
    };
  }, [chart]);

  const toggle = (key: keyof ToggleState) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasData = (key: keyof ToggleState): boolean => {
    switch (key) {
      case "sma50":
        return !!indicators.sma50?.length;
      case "sma200":
        return !!indicators.sma200?.length;
      case "bollinger":
        return !!indicators.bollingerUpper?.length && !!indicators.bollingerLower?.length;
      case "rsi":
        return !!indicators.rsi?.length;
      case "macd":
        return !!indicators.macd?.macd.length;
    }
  };

  const indicatorColors: Record<keyof ToggleState, string> = {
    sma50: "#3b82f6",
    sma200: "#f97316",
    bollinger: "#a1a1aa",
    rsi: "#a855f7",
    macd: "#3b82f6",
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(INDICATOR_LABELS) as (keyof ToggleState)[]).map((key) => {
          const available = hasData(key);
          return (
            <button
              key={key}
              onClick={() => available && toggle(key)}
              disabled={!available}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors",
                toggles[key]
                  ? "border-border bg-secondary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                !available && "opacity-40 cursor-not-allowed"
              )}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: indicatorColors[key] }}
              />
              {INDICATOR_LABELS[key]}
            </button>
          );
        })}
      </div>

      {toggles.rsi && indicators.rsi && (
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">
            RSI (14)
          </div>
          <div ref={rsiContainerRef} className="w-full" />
        </div>
      )}

      {toggles.macd && indicators.macd && (
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">
            MACD (12, 26, 9)
          </div>
          <div ref={macdContainerRef} className="w-full" />
        </div>
      )}
    </div>
  );
}
