"use client";

import { useEffect, useState, useCallback } from "react";
import { EmployeeStatusChart } from "@/components/dashboard/charts/CandidateStatusChart";
import { JobStatusChart } from "@/components/dashboard/charts/JobStatusChart";
import { JobTypeChart } from "@/components/dashboard/charts/JobTypeChart";
import { getApiUrl, getAuthToken } from "@/lib/api-config";
import { Loader, SkeletonCard } from "@/components/ui/loader";
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

let statsCache: { data: StatsData; timestamp: number } | null = null;
const CACHE_TTL = 30000;

export default function DashboardDetail({
  initialStats,
}: {
  initialStats: StatsData | null;
}) {
  const [stats, setStats] = useState<StatsData | null>(initialStats);
  const [loading, setLoading] = useState(!initialStats);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (statsCache && Date.now() - statsCache.timestamp < CACHE_TTL) {
      setStats(statsCache.data);
      setLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      const apiUrl = getApiUrl();

      const res = await fetch(`${apiUrl}/api/v1/stats`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error("API error");

      const data: StatsData = await res.json();

      statsCache = { data, timestamp: Date.now() };
      setStats(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setError("Failed to load dashboard data");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialStats) {
      fetchStats();
    }
  }, [fetchStats, initialStats]);

  if (loading && !stats) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <Loader />
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
          onClick={() => {
            statsCache = null;
            setLoading(true);
            setError(null);
            fetchStats();
          }}
          className="mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
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
    <div className="space-y-6 sm:space-y-8 lg:space-y-8">
      {/* Overview Section */}
      <section>
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold">Overview</h2>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm card-hover relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Briefcase className="w-8 h-8 sm:w-12 sm:h-12" />
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
              Open Requests
            </h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{totalJobs}</p>
            <div className="mt-2 sm:mt-4 flex items-center text-xs text-green-600 font-medium">
              <span>Active staffing demand</span>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm card-hover relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-8 h-8 sm:w-12 sm:h-12" />
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Candidates
            </h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.total_employees}</p>
            <div className="mt-2 sm:mt-4 flex items-center text-xs text-blue-600 font-medium">
              <span>Managed profiles</span>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4 sm:p-6 shadow-sm card-hover relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-8 h-8 sm:w-12 sm:h-12" />
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Resumes
            </h3>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.total_resumes}</p>
            <div className="mt-2 sm:mt-4 flex items-center text-xs text-purple-600 font-medium">
              <span>Processed documents</span>
            </div>
          </div>
        </div>
      </section>

      {/* Reports Section */}
      <section>
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold">Reports & Analytics</h2>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          <div className="card-hover">
            <JobStatusChart stats={stats.requests} />
          </div>
          <div className="card-hover">
            <EmployeeStatusChart stats={stats.candidates_by_status} />
          </div>
        </div>
      </section>
    </div>
  );
}