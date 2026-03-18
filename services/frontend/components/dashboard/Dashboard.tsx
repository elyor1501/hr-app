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

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    console.log("Dashboard: Using API URL:", apiUrl);

    if (!apiUrl) {
      console.error("CRITICAL: NEXT_PUBLIC_API_URL is NOT defined in environment variables!");
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers: HeadersInit = {
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/?skip=0&limit=100`, { headers })
      .then(res => {
        console.log("Jobs response status:", res.status);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log("Jobs data received:", data);
        const arrayData = Array.isArray(data) ? data : (data?.jobs || []);
        setJobStatus(arrayData);
        setJobType(arrayData);
      })
      .catch(err => {
        console.error("Error fetching jobs:", err);
        if (err instanceof Error) console.error("Error message:", err.message);
      });

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/candidates/?skip=0&limit=100`, { headers })
      .then(res => {
        console.log("Candidates response status:", res.status);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log("Candidates data received:", data);
        const arrayData = Array.isArray(data) ? data : (data?.candidates || []);
        setEmployeeStatus(arrayData);
      })
      .catch(err => {
        console.error("Error fetching candidates:", err);
        if (err instanceof Error) console.error("Error message:", err.message);
      });

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/resumes/?skip=0&limit=100`, { headers })
      .then(res => {
        console.log("Resumes response status:", res.status);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log("Resumes data received:", data);
        const arrayData = Array.isArray(data) ? data : (data?.resumes || []);
        setResumes(arrayData);
      })
      .catch(err => {
        console.error("Error fetching resumes:", err);
        if (err instanceof Error) console.error("Error message:", err.message);
      });
  }, []);

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