"use client";

import { useState, useEffect, useCallback } from "react";
import { EmployeeStatusChart } from "@/components/dashboard/charts/CandidateStatusChart";
import { JobStatusChart } from "@/components/dashboard/charts/JobStatusChart";
import { getApiUrl, getAuthToken } from "@/lib/api-config";
import { SkeletonCard } from "@/components/ui/loader";
import { Users, Briefcase, FileText, TrendingUp } from "lucide-react";

interface StatsData {
  total_jobs: number;
  total_employees: number;
  total_resumes: number;
  jobs_by_type: {
    full_time: number;
    part_time: number;
    contract: number;
    internship: number;
    entry_level: number;
  };
  jobs_by_status: {
    open_jobs: number;
    closed_jobs: number;
  };
  candidates_by_status: {
    active: number;
    inactive: number;
  };
  requests: {
    open_requests: number;
    in_progress_requests: number;
    signed_requests: number;
    closed_requests: number;
    total_active_requests: number;
  };
}

export default function DashboardDetail({
  initialStats,
}: {
  initialStats: StatsData | null;
}) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const token = getAuthToken();
      const apiUrl = getApiUrl();
      const fetchUrl = apiUrl ? `${apiUrl}/api/v1/stats` : `/api/v1/stats`;

      const res = await fetch(fetchUrl, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });

      if (!res.ok) throw new Error("API error");

      const data: StatsData = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      if (!stats) {
        setError("Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    await fetchStats();
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="h-[200px] w-full bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 sm:p-6 text-center">
        <p className="text-destructive font-medium text-sm sm:text-base">
          {error || "No data available"}
        </p>
        <button
          onClick={handleRetry}
          className="mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white transition-colors text-sm sm:text-base"
          style={{ backgroundColor: "#429ABD" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#2d6d8a")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#429ABD")
          }
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    open_requests = 0,
    in_progress_requests = 0,
    signed_requests = 0,
    closed_requests = 0,
  } = stats.requests || {};

  const totalJobs =
    open_requests + in_progress_requests + signed_requests + closed_requests;

  return (
    <div className="flex flex-col h-full space-y-1 sm:space-y-2 lg:space-y-2">
      <section className="shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <div
            className="p-1 rounded-md"
            style={{ backgroundColor: "#429ABD20" }}
          >
            <TrendingUp
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              style={{ color: "#429ABD" }}
            />
          </div>

          <h2 className="text-sm font-semibold">Overview</h2>
        </div>

        <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-card border rounded-lg px-4 py-2 shadow-sm card-hover relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:border-[#F5A623]/30">
            {" "}
            <div className="absolute top-0 right-0 p-1.5 opacity-15 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110">
              <Briefcase
                className="w-6 h-6 sm:w-8 sm:h-8 transition-all duration-300"
                style={{ color: "#429ABD" }}
              />
            </div>
            <h3 className="text-xs font-medium text-muted-foreground">
              Total Requests
            </h3>
            <p className="text-xl sm:text-2xl font-bold mt-1">{totalJobs}</p>
            <div
              className="mt-1.5 flex items-center text-xs font-semibold"
              style={{ color: "#F5A623" }}
            >
              <span>Active staffing demand</span>
            </div>
          </div>

          <div className="bg-card border rounded-lg px-4 py-2 shadow-sm card-hover relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:border-[#F5A623]/30">
            {" "}
            <div className="absolute top-0 right-0 p-1.5 opacity-15 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110">
              <Users
                className="w-6 h-6 sm:w-8 sm:h-8 transition-all duration-300"
                style={{ color: "#429ABD" }}
              />
            </div>
            <h3 className="text-xs font-medium text-muted-foreground">
              Total Candidates
            </h3>
            <p className="text-xl sm:text-2xl font-bold mt-1">
              {stats.total_employees}
            </p>
            <div
              className="mt-1.5 flex items-center text-xs font-semibold"
              style={{ color: "#F5A623" }}
            >
              <span>Managed profiles</span>
            </div>
          </div>

          <div className="bg-card border rounded-lg px-4 py-2 shadow-sm card-hover relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:border-[#F5A623]/30">
            {" "}
            <div className="absolute top-0 right-0 p-1.5 opacity-15 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110">
              <FileText
                className="w-6 h-6 sm:w-8 sm:h-8 transition-all duration-300"
                style={{ color: "#429ABD" }}
              />
            </div>
            <h3 className="text-xs font-medium text-muted-foreground">
              Total Resumes
            </h3>
            <p className="text-xl sm:text-2xl font-bold mt-1">
              {" "}
              {stats.total_resumes}
            </p>
            <div
              className="mt-1.5 flex items-center text-xs font-semibold"
              style={{ color: "#F5A623" }}
            >
              <span>Processed documents</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex-1 flex flex-col min-h-0 pb-2">
        <div className="flex items-center gap-1.5 mb-2 shrink-0">
          <div
            className="p-1 rounded-md"
            style={{ backgroundColor: "#F5A62315" }}
          >
            <FileText
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              style={{ color: "#F5A623" }}
            />
          </div>

          <h2 className="text-sm font-semibold">Reports & Analytics</h2>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2 flex-1 min-h-0">
          <div className="card-hover h-full">
            <JobStatusChart stats={stats.requests} />
          </div>

          <div className="card-hover h-full">
            <EmployeeStatusChart stats={stats.candidates_by_status} />
          </div>
        </div>
      </section>
    </div>
  );
}
