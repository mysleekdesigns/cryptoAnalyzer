"use client";

import { cn } from "@/lib/utils/index";
import { formatSignalScore } from "@/lib/utils/formatters";
import type { CompositeSignal } from "@/types/signals";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SignalCardProps {
  signal: Pick<
    CompositeSignal,
    "symbol" | "assetType" | "compositeScore" | "signalType" | "crossConfirmation"
  >;
}

export function SignalCard({ signal }: SignalCardProps) {
  const formatted = formatSignalScore(signal.compositeScore);

  return (
    <Card className="py-4">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase truncate">
              {signal.symbol}
            </span>
            {signal.crossConfirmation?.isConfirmed && (
              <span
                className="size-4 inline-flex items-center justify-center rounded-full bg-strong-buy-muted text-strong-buy text-[10px]"
                title={`Cross confirmed: ${signal.crossConfirmation.direction}`}
              >
                ✓
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground capitalize">
            {signal.assetType}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={cn(
              "text-xl font-bold font-mono tabular-nums",
              formatted.colorClass
            )}
          >
            {signal.compositeScore}
          </span>
          <Badge
            variant="secondary"
            className={cn("text-xs", formatted.colorClass, formatted.bgClass)}
          >
            {formatted.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
