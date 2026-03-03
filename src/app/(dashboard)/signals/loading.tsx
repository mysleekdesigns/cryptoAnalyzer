import { Skeleton } from "@/components/ui/skeleton";

export default function SignalsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Count */}
      <Skeleton className="h-3.5 w-24" />

      {/* Table rows */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-border/50 bg-card/50 px-4 py-3"
          >
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="ml-auto h-5 w-16" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
