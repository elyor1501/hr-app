"use client";

export const Loader = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin shadow-[0_0_15px_rgba(var(--primary),0.3)]" />
        
        {/* Inner decorative ring */}
        <div className="absolute inset-2 border-2 border-primary/10 rounded-full" />
      </div>
    </div>
  );
};

export const SkeletonCard = () => (
  <div className="bg-card border rounded-xl p-6 animate-pulse space-y-4 shadow-sm border-border/50">
    <div className="h-4 bg-muted rounded w-24"></div>
    <div className="h-8 bg-muted rounded w-16"></div>
  </div>
);
