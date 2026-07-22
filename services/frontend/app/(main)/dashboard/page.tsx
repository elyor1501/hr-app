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
    <div className="flex flex-col h-[calc(100vh-5rem)] space-y-2">
      <div
        className="relative overflow-hidden rounded-xl px-4 sm:px-6 lg:px-8 py-2 mt-1 text-white flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #429ABD 0%, #2d6d8a 100%)",
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 animate-pulse" />
            <span className="text-xs sm:text-sm text-white/80 font-medium">
              Platform Analytics
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mb-0.5">
            Welcome Back 👋
          </h1>

          <p className="text-xs sm:text-sm text-white/80 font-medium">
            You have new candidates to review and job postings reaching their
            peak.
          </p>
        </div>

        {/* Decorative elements with new colors */}
        <div
          className="absolute -right-20 -top-20 w-48 h-48 sm:w-64 sm:h-64 rounded-full blur-3xl"
          style={{ background: "#F5A623", opacity: 0.15 }}
        />
        <div
          className="absolute -right-10 -bottom-10 w-32 h-32 sm:w-40 sm:h-40 rounded-full blur-2xl"
          style={{ background: "#F5A623", opacity: 0.1 }}
        />
      </div>

      <div className="flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardStats />
        </Suspense>
      </div>
    </div>
  );
}
