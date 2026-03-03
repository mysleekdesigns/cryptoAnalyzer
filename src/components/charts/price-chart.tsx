"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { cn } from "@/lib/utils";

interface PriceDataPoint {
  time: number;
  value: number;
}

interface PriceChartProps {
  data: PriceDataPoint[];
  color?: string;
  height?: number;
  className?: string;
  showGrid?: boolean;
  showTimeScale?: boolean;
  showPriceScale?: boolean;
}

export function PriceChart({
  data,
  color = "#22c55e",
  height = 200,
  className,
  showGrid = false,
  showTimeScale = true,
  showPriceScale = true,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      height,
      layout: {
        background: { color: "transparent" },
        textColor: "#a1a1aa",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: showGrid, color: "#27272a40" },
        horzLines: { visible: showGrid, color: "#27272a40" },
      },
      crosshair: {
        vertLine: {
          color: "#a1a1aa50",
          style: LineStyle.Dashed,
          labelVisible: showTimeScale,
        },
        horzLine: {
          color: "#a1a1aa50",
          style: LineStyle.Dashed,
          labelVisible: showPriceScale,
        },
      },
      rightPriceScale: {
        visible: showPriceScale,
        borderColor: "#27272a",
      },
      timeScale: {
        visible: showTimeScale,
        borderColor: "#27272a",
      },
      handleScroll: showTimeScale,
      handleScale: showTimeScale,
    });

    chartRef.current = chart;

    const series = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: color,
      priceLineVisible: false,
      lastValueVisible: showPriceScale,
    });
    seriesRef.current = series;

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
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, color, showGrid, showTimeScale, showPriceScale]);

  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const sorted = [...data].sort((a, b) => a.time - b.time);
    const lineData = sorted.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.value,
    }));

    seriesRef.current.setData(lineData);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full", className)}
    />
  );
}
