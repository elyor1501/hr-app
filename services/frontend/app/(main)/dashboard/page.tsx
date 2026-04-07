import DashboardDetail from "@/components/dashboard/Dashboard";
import RouteProtection from "@/components/routeProtection";
import { Sparkles } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-10 text-primary-foreground shadow-2xl shadow-primary/20">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary-foreground/80 animate-pulse" />
            <span className="text-sm font-semibold uppercase tracking-wider opacity-80">Platform Analytics</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Welcome Back 👋</h1>
          <p className="text-primary-foreground/70 max-w-xl font-medium">
            Your recruitment pipeline is looking healthy today. You have new candidates to review and job postings reaching their peak.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
      </div>
      
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
        <RouteProtection/>
        <DashboardDetail />
      </div>
    </div>
  );
}

