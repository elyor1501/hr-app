"use client";

import { useEffect, useState } from "react";
import { EmployeeStatusChart } from "@/components/dashboard/charts/CandidateStatusChart";
import { JobStatusChart } from "@/components/dashboard/charts/JobStatusChart";
import { JobTypeChart } from "@/components/dashboard/charts/JobTypeChart";

export default function DashboardDetail() {
  const [jobStatus, setJobStatus] = useState<any[]>([]);
  const [jobType, setJobType] = useState<any[]>([]);
  const [employeeStatus, setEmployeeStatus] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      setError("API URL not configured");
      setLoading(false);
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    const headers: HeadersInit = {
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 second timeout

    const fetchJobs = fetch(`${apiUrl}/api/v1/jobs/?skip=0&limit=100`, {
      headers,
      signal: abortController.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Jobs API error: ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        return null;
      });

    const fetchCandidates = fetch(
      `${apiUrl}/api/v1/parsed-resumes/?skip=0&limit=100`,
      {
        headers,
        signal: abortController.signal,
      },
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Candidates API error: ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        return null;
      });

    const fetchResumes = fetch(`${apiUrl}/api/v1/resumes/?skip=0&limit=100`, {
      headers,
      signal: abortController.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Resumes API error: ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        return null;
      });

    Promise.all([fetchJobs, fetchCandidates, fetchResumes])
      .then(([jobsData, candidatesData, resumesData]) => {
        const jobsArray = Array.isArray(jobsData)
          ? jobsData
          : jobsData?.jobs || [];
        setJobStatus(jobsArray);
        setJobType(jobsArray);

        const candidatesArray = Array.isArray(candidatesData)
          ? candidatesData
          : candidatesData?.candidates || [];
        setEmployeeStatus(candidatesArray);

        const resumesArray = Array.isArray(resumesData)
          ? resumesData
          : resumesData?.resumes || [];
        setResumes(resumesArray);

        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load dashboard data");
        setLoading(false);
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border rounded-xl p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border rounded-xl p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
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
          <p className="text-3xl font-bold mt-2">{jobStatus.length}</p>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-sm text-muted-foreground">Total Employees</h3>
          <p className="text-3xl font-bold mt-2">{employeeStatus.length}</p>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-sm text-muted-foreground">Total Resumes</h3>
          <p className="text-3xl font-bold mt-2">{resumes.length}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <JobStatusChart jobs={jobStatus} />
        <JobTypeChart jobs={jobType} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <EmployeeStatusChart employees={employeeStatus} />
      </div>
    </div>
  );
}
