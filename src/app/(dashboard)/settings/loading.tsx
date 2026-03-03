import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      {/* Signal Configuration */}
      <Skeleton className="h-[320px] w-full rounded-xl" />

      {/* Alerts Management */}
      <Skeleton className="h-[280px] w-full rounded-xl" />
    </div>
  );
}
