import { Skeleton } from "@/components/ui/skeleton";

export default function WatchlistLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Search */}
      <Skeleton className="h-9 w-full max-w-md" />

      {/* Count */}
      <Skeleton className="h-3.5 w-32" />

      {/* Table skeleton */}
      <div className="rounded-xl border">
        <div className="space-y-0 divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-14" />
              <Skeleton className="ml-auto h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
