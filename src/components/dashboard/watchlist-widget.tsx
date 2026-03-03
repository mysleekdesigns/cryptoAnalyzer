"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/index";
import { formatCurrency, formatSignalScore } from "@/lib/utils/formatters";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WatchlistItem {
  symbol: string;
  name: string;
  assetType: "crypto" | "stock";
  price: number;
  signalScore?: number;
  image?: string;
}

interface WatchlistWidgetProps {
  items: WatchlistItem[];
}

export function WatchlistWidget({ items }: WatchlistWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Watchlist</CardTitle>
        <CardAction>
          <Link
            href="/watchlist"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View All
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Add assets to your watchlist
            </p>
            <Link
              href="/watchlist"
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              Browse assets
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {items.slice(0, 5).map((item) => {
              const signal = item.signalScore != null
                ? formatSignalScore(item.signalScore)
                : null;

              return (
                <Link
                  key={item.symbol}
                  href={`/assets/${item.assetType}/${item.symbol}`}
                  className="flex items-center justify-between gap-2 py-2 px-2 rounded-md hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        width={20}
                        height={20}
                        className="rounded-full shrink-0"
                      />
                    ) : (
                      <div className="size-5 rounded-full bg-secondary shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {item.symbol.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">
                      {formatCurrency(item.price)}
                    </span>
                    {signal && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px]",
                          signal.colorClass,
                          signal.bgClass
                        )}
                      >
                        {signal.label}
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
