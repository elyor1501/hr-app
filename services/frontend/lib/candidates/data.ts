import { getApiUrl, getAuthToken } from "../api-config";

export type CandidateList = {
  id: string;
  resume_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  github?: string | null;
  linkedin_url?: string | null;
  portfolio?: string | null;
  summary?: string | null;
  skills?: string[];
  current_title?: string | null;
  current_company?: string | null;
  years_of_experience?: number | null;
  education?: any[];
  experience?: any[];
  projects?: any[];
  certifications?: any[];
  candidate_status?: "active" | "inactive";
  status?: "processing" | "completed" | "error";
};

let candidatesCache: { data: CandidateList[]; timestamp: number } | null = null;
const CACHE_TTL = 30000;

export async function getCandidates(): Promise<CandidateList[]> {
  try {
    const isServer = typeof window === "undefined";

    if (!isServer && candidatesCache && Date.now() - candidatesCache.timestamp < CACHE_TTL) {
      return candidatesCache.data;
    }

    const apiUrl = getApiUrl();
    const token = getAuthToken();
    const fetchUrl = apiUrl ? `${apiUrl}/api/v1/candidates` : `/api/v1/candidates`;

    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(fetchUrl, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Unable to read response");
      console.error("Failed to fetch candidates:", res.status, text);
      return [];
    }

    const data = await res.json();

    let items: CandidateList[] = [];
    if (data && data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (Array.isArray(data)) {
      items = data;
    }

    if (!isServer) {
      candidatesCache = { data: items, timestamp: Date.now() };
    }

    return items;
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
}

export function invalidateCandidatesCache() {
  candidatesCache = null;
}

let candidateByIdCache: Map<string, { data: any; timestamp: number }> = new Map();

export async function getCandidateById(id: string) {
  try {
    const cached = candidateByIdCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const apiUrl = getApiUrl();
    const token = getAuthToken();
    const fetchUrl = apiUrl ? `${apiUrl}/api/v1/candidates/${id}/profile` : `/api/v1/candidates/${id}/profile`;

    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(fetchUrl, {
      method: "GET",
      headers,
      next: { revalidate: 30 },
    });

    if (res.status === 404) {
      return { status: "processing" };
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("Fetch candidate failed:", res.status, text);
      return null;
    }

    const data = await res.json();
    const result = Array.isArray(data) ? data[0] : data;

    candidateByIdCache.set(id, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error("getCandidateById error:", error);
    return null;
  }
}

export async function matchJobs(resumeId: string) {
  try {
    const apiUrl = getApiUrl();
    const fetchUrl = apiUrl ? `${apiUrl}/api/v1/match/candidate-to-jobs` : `/api/v1/match/candidate-to-jobs`;

    const res = await fetch(fetchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        candidate_id: resumeId,
        top_k: 10,
        min_score: 0.0,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("API ERROR:", data);
      throw new Error("Failed to match jobs");
    }

    return data;
  } catch (error) {
    console.error("matchJobs error:", error);
    return { results: [] };
  }
}