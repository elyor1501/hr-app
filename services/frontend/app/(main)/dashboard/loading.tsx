import { StatCardSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-10">
      <div className="h-36 rounded-3xl bg-muted animate-pulse" />
      <div className="grid gap-6 md:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="h-48 rounded-xl bg-muted animate-pulse lg:col-span-2" />
      </div>
    </div>
  );
}
