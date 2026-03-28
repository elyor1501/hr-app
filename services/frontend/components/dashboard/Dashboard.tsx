"use client";

import { useEffect, useState, useCallback } from "react";
import { EmployeeStatusChart } from "@/components/dashboard/charts/CandidateStatusChart";
import { JobStatusChart } from "@/components/dashboard/charts/JobStatusChart";
import { JobTypeChart } from "@/components/dashboard/charts/JobTypeChart";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      setError("API URL not configured");
      setLoading(false);
      return;
    }

    if (statsCache && Date.now() - statsCache.timestamp < CACHE_TTL) {
      setStats(statsCache.data);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${apiUrl}/api/v1/stats`, { headers });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
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
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error || "No data available"}</p>
        <button
          onClick={() => {
            statsCache = null;
            setLoading(true);
            setError(null);
            fetchStats();
          }}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-sm text-muted-foreground">Total Jobs</h3>
          <p className="text-3xl font-bold mt-2">{stats.total_jobs}</p>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-sm text-muted-foreground">Total Employees</h3>
          <p className="text-3xl font-bold mt-2">{stats.total_employees}</p>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-sm text-muted-foreground">Total Resumes</h3>
          <p className="text-3xl font-bold mt-2">{stats.total_resumes}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <JobStatusChart stats={stats.jobs_by_status} totalJobs={stats.total_jobs} />
        <JobTypeChart stats={stats.jobs_by_type} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <EmployeeStatusChart stats={stats.candidates_by_status} />
      </div>
    </div>
  );
}