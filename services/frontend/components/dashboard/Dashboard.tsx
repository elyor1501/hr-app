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
}

let statsCache: { data: StatsData; timestamp: number } | null = null;
const CACHE_TTL = 30000;

export default function DashboardDetail() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [openRequests, setOpenRequests] = useState(0);
  const [requestCounts, setRequestCounts] = useState({
    open: 0,
    inProgress: 0,
  });
  const [loading, setLoading] = useState(true);
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
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const [statsRes, requestsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/stats`, { headers }),
        fetch(`${apiUrl}/api/v1/requests`, { headers }),
      ]);

      if (!statsRes.ok || !requestsRes.ok) {
        throw new Error("API error");
      }
      const statsData = await statsRes.json();
      const requestsData = await requestsRes.json();
      const openCount = requestsData.filter(
        (req: any) => req.state === "open",
      ).length;

      const inProgressCount = requestsData.filter(
        (req: any) => req.state === "in_progress",
      ).length;

      setRequestCounts({
        open: openCount,
        inProgress: inProgressCount,
      });

      statsCache = { data: statsData, timestamp: Date.now() };

      setStats(statsData);
      setOpenRequests(openCount);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setError("Failed to load dashboard data");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
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
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
        <p className="text-destructive font-medium">{error || "No data available"}</p>
        <button
          onClick={() => {
            statsCache = null;
            setLoading(true);
            setError(null);
            fetchStats();
          }}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Overview</h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-card border rounded-xl p-6 shadow-sm card-hover relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Briefcase className="w-12 h-12" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Open Requests
            </h3>

            <p className="text-3xl font-bold mt-2">
              {requestCounts.open + requestCounts.inProgress}
            </p>

            <div className="mt-3 flex items-center gap-4 text-xs font-medium">
              <span className="px-2 py-1 rounded-full bg-green-100 text-green-700">
                Open: {requestCounts.open}
              </span>

              <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                In Progress: {requestCounts.inProgress}
              </span>
            </div>

            <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
              <span>Active staffing demand</span>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm card-hover relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-12 h-12" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Candidates</h3>
            <p className="text-3xl font-bold mt-2">{stats.total_employees}</p>
            <div className="mt-4 flex items-center text-xs text-blue-600 font-medium">
              <span>Managed profiles</span>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm card-hover relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-12 h-12" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Resumes</h3>
            <p className="text-3xl font-bold mt-2">{stats.total_resumes}</p>
            <div className="mt-4 flex items-center text-xs text-purple-600 font-medium">
              <span>Processed documents</span>
            </div>
          </div>
        </div>
      </section>

      {/* Reports Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Reports & Analytics</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-hover">
            <JobStatusChart stats={stats.jobs_by_status} totalJobs={stats.total_jobs} />
          </div>
          <div className="card-hover">
            <JobTypeChart stats={stats.jobs_by_type} />
          </div>
          <div className="card-hover lg:col-span-2">
            <EmployeeStatusChart stats={stats.candidates_by_status} />
          </div>
        </div>
      </section>
    </div>
  );
}