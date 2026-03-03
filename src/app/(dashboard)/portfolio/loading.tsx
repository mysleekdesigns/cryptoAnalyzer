import { Skeleton } from "@/components/ui/skeleton";

export default function PortfolioLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="mt-2 h-4 w-52" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>

      {/* Holdings table */}
      <Skeleton className="h-[300px] rounded-xl" />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[350px] rounded-xl" />
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
    </div>
  );
}
