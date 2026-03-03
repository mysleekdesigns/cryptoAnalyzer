"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/index";
import { formatCurrency, formatPercent } from "@/lib/utils/formatters";
import type { Asset } from "@/types/market";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TopMoversProps {
  assets: Asset[];
  isLoading: boolean;
}

function MoverItem({ asset }: { asset: Asset }) {
  const router = useRouter();
  const pct = formatPercent(asset.priceChangePercent24h);

  return (
    <div
      className="flex items-center justify-between gap-2 py-2 px-2 rounded-md cursor-pointer hover:bg-secondary/30 transition-colors"
      onClick={() =>
        router.push(`/assets/${asset.assetType}/${asset.symbol}`)
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        {asset.image ? (
          <img
            src={asset.image}
            alt={asset.name}
            width={20}
            height={20}
            className="rounded-full shrink-0"
          />
        ) : (
          <div className="size-5 rounded-full bg-secondary shrink-0" />
        )}
        <div className="min-w-0">
          <span className="text-sm font-medium truncate block">
            {asset.symbol.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground font-mono tabular-nums">
          {formatCurrency(asset.currentPrice)}
        </span>
        <Badge
          variant="secondary"
          className={cn("font-mono tabular-nums text-xs", pct.colorClass)}
        >
          {pct.text}
        </Badge>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2 px-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-3.5 w-12" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TopMovers({ assets, isLoading }: TopMoversProps) {
  const sorted = [...assets].sort(
    (a, b) => b.priceChangePercent24h - a.priceChangePercent24h
  );
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top Movers</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Gainers
              </h4>
              <div>
                {gainers.map((asset) => (
                  <MoverItem key={asset.id} asset={asset} />
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Losers
              </h4>
              <div>
                {losers.map((asset) => (
                  <MoverItem key={asset.id} asset={asset} />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
