import DashboardDetail from "@/components/dashboard/Dashboard";
import RouteProtection from "@/components/routeProtection";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6 border">
        <h1 className="text-2xl font-bold">Welcome Back 👋</h1>
      </div>
      <div>
        <RouteProtection/>
        <DashboardDetail />
      </div>
    </div>
  );
}
