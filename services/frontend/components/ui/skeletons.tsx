import { Loader2 } from "lucide-react";

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading data, please wait...
      </div>
      <div className="flex items-center justify-between border p-4 rounded-lg">
        <div className="h-5 w-36 rounded-md bg-muted animate-pulse" />
        <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
      </div>
      <div className="h-9 w-64 rounded-lg bg-muted animate-pulse" />
      <div className="rounded-xl border overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-4 py-3 bg-muted/40 border-b">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 rounded bg-muted animate-pulse" />
          ))}
        </div>
        {[...Array(rows)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-5 gap-4 px-4 py-4 border-b last:border-0"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {[...Array(5)].map((_, j) => (
              <div
                key={j}
                className="h-4 rounded bg-muted animate-pulse"
                style={{ width: `${60 + Math.random() * 40}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading data, please wait...
      </div>
      <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      <div className="h-8 w-16 rounded-lg bg-muted animate-pulse" />
      <div className="h-3 w-32 rounded bg-muted animate-pulse" />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading data, please wait...
      </div>
      <div className="h-32 rounded-2xl bg-muted animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-muted animate-pulse" />
    </div>
  );
}
