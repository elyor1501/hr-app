import DashboardDetail from "@/components/dashboard/Dashboard";
import { Sparkles } from "lucide-react";
import { getStats } from "@/lib/dashboard/data";
import { Suspense } from "react";
import { SkeletonCard } from "@/components/ui/loader";

export const dynamic = "force-dynamic";

async function DashboardStats() {
  const stats = await getStats();
  return <DashboardDetail initialStats={stats} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="h-[300px] sm:h-[400px] w-full bg-muted animate-pulse rounded-xl" />
    </div>
  );
}

export default async function Dashboard() {
  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-primary px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 text-primary-foreground shadow-2xl shadow-primary/20">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground/80 animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider opacity-80">Platform Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight mb-1 sm:mb-2">
            Welcome Back 👋
          </h1>
          <p className="text-sm sm:text-base text-primary-foreground/70 max-w-xl font-medium">
            Your recruitment pipeline is looking healthy today. You have new candidates to review and job postings reaching their peak.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 w-48 h-48 sm:w-64 sm:h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -right-10 -bottom-10 w-32 h-32 sm:w-40 sm:h-40 bg-black/10 rounded-full blur-2xl" />
      </div>
      
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardStats />
        </Suspense>
      </div>
    </div>
  );
}