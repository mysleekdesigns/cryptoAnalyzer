"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils/index";
import {
  formatCurrency,
  formatPercent,
  formatLargeNumber,
} from "@/lib/utils/formatters";
import type { Asset } from "@/types/market";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketOverviewProps {
  assets: Asset[];
  isLoading: boolean;
}

function MiniSparkline({ data, up }: { data: number[]; up: boolean }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      <polyline
        fill="none"
        stroke={up ? "var(--color-chart-up)" : "var(--color-chart-down)"}
        strokeWidth="1.5"
        points={points.join(" ")}
      />
    </svg>
  );
}

function AssetRow({ asset }: { asset: Asset }) {
  const router = useRouter();
  const pct = formatPercent(asset.priceChangePercent24h);

  return (
    <tr
      className="group cursor-pointer border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      tabIndex={0}
      role="link"
      aria-label={`View ${asset.name} details`}
      onClick={() =>
        router.push(`/assets/${asset.assetType}/${asset.symbol}`)
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/assets/${asset.assetType}/${asset.symbol}`);
        }
      }}
    >
      <td className="py-3 pr-2 text-xs text-muted-foreground w-8 text-right">
        {asset.rank ?? "-"}
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          {asset.image ? (
            <Image
              src={asset.image}
              alt={asset.name}
              width={24}
              height={24}
              className="rounded-full shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="size-6 rounded-full bg-secondary shrink-0" />
          )}
          <div className="min-w-0">
            <span className="text-sm font-medium truncate block">
              {asset.name}
            </span>
            <span className="text-xs text-muted-foreground uppercase">
              {asset.symbol}
            </span>
          </div>
        </div>
      </td>
      <td className="py-3 px-2 text-sm text-right font-mono tabular-nums">
        {formatCurrency(asset.currentPrice)}
      </td>
      <td className={cn("py-3 px-2 text-sm text-right font-mono tabular-nums", pct.colorClass)}>
        {pct.text}
      </td>
      <td className="py-3 px-2 text-sm text-right text-muted-foreground hidden lg:table-cell">
        {asset.marketCap ? `$${formatLargeNumber(asset.marketCap)}` : "-"}
      </td>
      <td className="py-3 pl-2 hidden md:table-cell">
        <MiniSparkline
          data={(asset as any).sparkline ?? []}
          up={asset.priceChangePercent24h >= 0}
        />
      </td>
    </tr>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

export function MarketOverview({ assets, isLoading }: MarketOverviewProps) {
  const cryptoAssets = assets.filter((a) => a.assetType === "crypto");
  const stockAssets = assets.filter((a) => a.assetType === "stock");

  const renderTable = (items: Asset[]) => {
    if (items.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No data available
        </p>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="pb-2 pr-2 text-right font-medium w-8">#</th>
              <th className="pb-2 px-2 text-left font-medium">Name</th>
              <th className="pb-2 px-2 text-right font-medium">Price</th>
              <th className="pb-2 px-2 text-right font-medium">24h %</th>
              <th className="pb-2 px-2 text-right font-medium hidden lg:table-cell">
                Market Cap
              </th>
              <th className="pb-2 pl-2 font-medium hidden md:table-cell">
                7d
              </th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 20).map((asset) => (
              <AssetRow key={asset.id} asset={asset} />
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Market Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <Tabs defaultValue="crypto">
            <TabsList>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
              <TabsTrigger value="stocks">Stocks</TabsTrigger>
            </TabsList>
            <TabsContent value="crypto" className="mt-4">
              {renderTable(cryptoAssets)}
            </TabsContent>
            <TabsContent value="stocks" className="mt-4">
              {stockAssets.length > 0 ? (
                renderTable(stockAssets)
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Stock data coming soon
                </p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
