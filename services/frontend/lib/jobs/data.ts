import { getApiUrl, getAuthToken } from "../api-config";

export type JobList = {
  id: string;
  title: string;
  department: string;
  employment_type: string;
  work_mode: string;
  location: string;
  application_posted?: string;
  description: string;
  responsibilities: string;
  required_skills: string;
  preferred_skills?: string;
  experience_required: number;
  education?: string[];
  salary_range?: string;
  openings?: number;
  hiring_manager?: string;
  application_deadline?: string;
  status: string;
};

let jobCache: { data: JobList[]; timestamp: number } | null = null;
const CACHE_TTL = 30000;

export async function getJob(): Promise<JobList[]> {
  try {
    if (jobCache && Date.now() - jobCache.timestamp < CACHE_TTL) {
      return jobCache.data;
    }

    const apiUrl = getApiUrl();
    const token = getAuthToken();
    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(
      `${apiUrl}/api/v1/jobs/?page=1&page_size=100`,
      {
        headers,
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "Unable to read response");
      console.error("Failed to fetch jobs:", res.status, text);
      return [];
    }

    const data = await res.json();

    let items: JobList[] = [];
    if (data && data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (Array.isArray(data)) {
      items = data;
    }

    jobCache = { data: items, timestamp: Date.now() };
    return items;
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
}

export function invalidateJobCache() {
  jobCache = null;
}

export async function getJobById(id: string) {
  try {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(
      `${apiUrl}/api/v1/jobs/${id}`,
      {
        method: "GET",
        headers,
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "Unable to read response");
      console.error(`Failed to fetch Job Details ${id}:`, res.status, text);
      throw new Error(`Failed to fetch Job details: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("getJobById error:", error);
    throw error;
  }
}

export async function matchCandidates(jobId: string, candidateIds: string[]) {
  const apiUrl = getApiUrl();
  const token = getAuthToken();

  const res = await fetch(
    `${apiUrl}/api/v1/match/bulk`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        job_id: jobId,
        candidate_ids: candidateIds,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Match error:", text);
    throw new Error("Failed to match candidates");
  }

  const data = await res.json();
  return data;
}