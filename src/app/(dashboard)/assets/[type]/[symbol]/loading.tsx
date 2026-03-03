import { Skeleton } from "@/components/ui/skeleton";

export default function AssetDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Asset header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>
      {/* Chart */}
      <Skeleton className="h-[400px] w-full rounded-xl" />
      {/* Analysis section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Skeleton className="h-[400px] rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    </div>
  );
}
