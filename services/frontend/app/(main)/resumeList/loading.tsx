import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
       <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading data, please wait...
      </div>
      {/* Header skeleton */}
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <div className="h-5 w-28 bg-muted animate-pulse rounded" />
        <div className="h-9 w-36 bg-muted animate-pulse rounded-md" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="bg-gray-100 dark:bg-neutral-800 flex gap-4 px-6 py-3">
          {[180, 140, 120, 100].map((w, i) => (
            <div key={i} className="h-4 bg-muted animate-pulse rounded" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800"
          >
            <div className="h-4 bg-muted animate-pulse rounded" style={{ width: 180 }} />
            <div className="h-4 bg-muted animate-pulse rounded" style={{ width: 140 }} />
            <div className="h-4 bg-muted animate-pulse rounded" style={{ width: 120 }} />
            <div className="flex gap-2" style={{ width: 100 }}>
              <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="h-8 w-8 bg-muted animate-pulse rounded" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-8 w-8 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}
