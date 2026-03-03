import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>

      {/* Market Overview card */}
      <Skeleton className="h-[420px] w-full rounded-xl" />

      {/* Grid: Fear & Greed + Top Movers + Signals */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Fear & Greed */}
        <Skeleton className="h-[280px] rounded-xl" />
        {/* Top Movers */}
        <Skeleton className="h-[280px] rounded-xl" />
        {/* Signal Highlights */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
