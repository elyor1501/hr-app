import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="pb-20 space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading data, please wait...
      </div>
      {/* Header skeleton */}
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header row */}
        <div className="bg-gray-100 dark:bg-neutral-800 flex gap-4 px-6 py-3">
          {[200, 120, 100, 100, 80].map((w, i) => (
            <div key={i} className={`h-4 bg-muted animate-pulse rounded`} style={{ width: w }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex flex-col gap-1" style={{ width: 200 }}>
              <div className="h-4 w-36 bg-muted animate-pulse rounded" />
              <div className="h-3 w-44 bg-muted/60 animate-pulse rounded" />
            </div>
            <div className="h-4 bg-muted animate-pulse rounded" style={{ width: 120 }} />
            <div className="h-4 bg-muted animate-pulse rounded" style={{ width: 100 }} />
            <div className="h-4 bg-muted animate-pulse rounded" style={{ width: 100 }} />
            <div className="flex gap-2" style={{ width: 80 }}>
              <div className="h-8 w-8 bg-muted animate-pulse rounded" />
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
