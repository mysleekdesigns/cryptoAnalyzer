"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type CandlestickData,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import { cn } from "@/lib/utils";
import type { OHLCVData, TimeRange } from "@/types/market";

const TIME_RANGES: TimeRange[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

interface CandlestickChartProps {
  data: OHLCVData[];
  onTimeRangeChange?: (range: TimeRange) => void;
  activeRange?: TimeRange;
  height?: number;
  className?: string;
}

export function CandlestickChart({
  data,
  onTimeRangeChange,
  activeRange = "1M",
  height = 400,
  className,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateTooltip = useCallback(
    (param: MouseEventParams<Time>) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      if (
        !param.time ||
        !param.point ||
        !candlestickSeriesRef.current
      ) {
        tooltip.style.display = "none";
        return;
      }

      const candleData = param.seriesData.get(
        candlestickSeriesRef.current
      ) as CandlestickData<Time> | undefined;

      if (!candleData || !("open" in candleData)) {
        tooltip.style.display = "none";
        return;
      }

      const volumeData = volumeSeriesRef.current
        ? param.seriesData.get(volumeSeriesRef.current)
        : undefined;

      const date = new Date((param.time as number) * 1000);
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const change = candleData.close - candleData.open;
      const changePercent = ((change / candleData.open) * 100).toFixed(2);
      const isPositive = change >= 0;

      const volumeVal =
        volumeData && "value" in volumeData
          ? (volumeData.value as number)
          : undefined;

      tooltip.innerHTML = `
        <div class="text-xs text-muted-foreground mb-1">${dateStr}</div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          <span class="text-muted-foreground">O</span><span>${candleData.open.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span class="text-muted-foreground">H</span><span>${candleData.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span class="text-muted-foreground">L</span><span>${candleData.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span class="text-muted-foreground">C</span><span>${candleData.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          ${volumeVal !== undefined ? `<span class="text-muted-foreground">V</span><span>${volumeVal.toLocaleString()}</span>` : ""}
        </div>
        <div class="mt-1 text-xs ${isPositive ? "text-[#22c55e]" : "text-[#ef4444]"}">
          ${isPositive ? "+" : ""}${change.toFixed(2)} (${isPositive ? "+" : ""}${changePercent}%)
        </div>
      `;
      tooltip.style.display = "block";

      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const tooltipWidth = 180;
      const tooltipHeight = tooltip.offsetHeight;
      let left = param.point.x + 16;
      let top = param.point.y - tooltipHeight / 2;

      if (left + tooltipWidth > containerRect.width) {
        left = param.point.x - tooltipWidth - 16;
      }
      if (top < 0) top = 0;
      if (top + tooltipHeight > containerRect.height) {
        top = containerRect.height - tooltipHeight;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    },
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      height,
      layout: {
        background: { color: "#0a0a0f" },
        textColor: "#a1a1aa",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "#27272a40" },
        horzLines: { color: "#27272a40" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#a1a1aa50",
          style: LineStyle.Dashed,
          labelBackgroundColor: "#27272a",
        },
        horzLine: {
          color: "#a1a1aa50",
          style: LineStyle.Dashed,
          labelBackgroundColor: "#27272a",
        },
      },
      rightPriceScale: {
        borderColor: "#27272a",
        scaleMargins: { top: 0.05, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candlestickSeriesRef.current = candleSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    chart.subscribeCrosshairMove(updateTooltip);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          chart.applyOptions({ width });
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(updateTooltip);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height, updateTooltip]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || data.length === 0) return;

    const sorted = [...data].sort((a, b) => a.time - b.time);

    const candleData = sorted.map((d) => ({
      time: d.time as UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumeData = sorted.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.volume,
      color: d.close >= d.open ? "#22c55e40" : "#ef444440",
    }));

    candlestickSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className={cn("relative", className)}>
      {onTimeRangeChange && (
        <div className="flex items-center gap-1 mb-2">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded transition-colors",
                activeRange === range
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      )}
      <div ref={containerRef} className="relative w-full">
        <div
          ref={tooltipRef}
          className="absolute z-10 pointer-events-none rounded-md border border-border bg-card p-2 shadow-lg"
          style={{ display: "none", width: 180 }}
        />
      </div>
    </div>
  );
}
