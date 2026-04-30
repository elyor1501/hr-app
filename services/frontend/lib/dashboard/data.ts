import { getApiUrl, getAuthToken } from "../api-config";

export interface StatsData {
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

export async function getStats(): Promise<StatsData | null> {
  const isServer = typeof window === "undefined";

  if (!isServer && statsCache && Date.now() - statsCache.timestamp < CACHE_TTL) {
    return statsCache.data;
  }

  try {
    const token = getAuthToken();
    const apiUrl = getApiUrl();

    const res = await fetch(`${apiUrl}/api/v1/stats`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 60 }, // Revalidate every minute
    });

    if (!res.ok) throw new Error("API error");

    const data: StatsData = await res.json();

    if (!isServer) {
      statsCache = { data, timestamp: Date.now() };
    }
    
    return data;
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    return null;
  }
}
