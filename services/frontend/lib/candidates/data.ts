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

export type PaginatedCandidates = {
  items: CandidateList[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

const CACHE_TTL = 30000;
let candidatesCache: { data: PaginatedCandidates; timestamp: number } | null = null;
let candidateByIdCache: Map<string, { data: any; timestamp: number }> = new Map();

export async function getCandidates(
  page: number = 1,
  page_size: number = 10
): Promise<PaginatedCandidates> {
  const isServer = typeof window === "undefined";

  if (
    !isServer &&
    candidatesCache &&
    candidatesCache.data.page === page &&
    candidatesCache.data.page_size === page_size &&
    Date.now() - candidatesCache.timestamp < CACHE_TTL
  ) {
    return candidatesCache.data;
  }

  const apiUrl = getApiUrl();
  const token = getAuthToken();
  const fetchUrl = apiUrl
    ? `${apiUrl}/api/v1/candidates?page=${page}&page_size=${page_size}`
    : `/api/v1/candidates?page=${page}&page_size=${page_size}`;

  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const empty: PaginatedCandidates = {
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  };

  try {
    const res = await fetch(fetchUrl, {
      headers,
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Unable to read response");
      console.error("Failed to fetch candidates:", res.status, text);
      return empty;
    }

    const data = await res.json();

    const result: PaginatedCandidates = {
      items: data.items ?? [],
      total: data.total ?? 0,
      page: data.page ?? page,
      page_size: data.page_size ?? page_size,
      total_pages: data.total_pages ?? 1,
      has_next: data.has_next ?? false,
      has_previous: data.has_previous ?? false,
    };

    if (!isServer) {
      candidatesCache = { data: result, timestamp: Date.now() };
    }

    return result;
  } catch (err) {
    console.error("Fetch error:", err);
    return empty;
  }
}

export function invalidateCandidatesCache() {
  candidatesCache = null;
}

export async function getCandidateById(id: string) {
  try {
    const cached = candidateByIdCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const apiUrl = getApiUrl();
    const token = getAuthToken();
    const fetchUrl = apiUrl
      ? `${apiUrl}/api/v1/candidates/${id}/profile`
      : `/api/v1/candidates/${id}/profile`;

    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    const fetchUrl = apiUrl
      ? `${apiUrl}/api/v1/match/candidate-to-jobs`
      : `/api/v1/match/candidate-to-jobs`;

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

export async function searchCandidates(params: any): Promise<CandidateList[]> {
  try {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set("q", params.q);
    if (params.name) queryParams.set("name", params.name as string);
    if (params.jobTitle) queryParams.set("job_title", params.jobTitle as string);
    if (params.location) queryParams.set("location", params.location as string);
    if (params.experienceLevel) queryParams.set("experience_level", params.experienceLevel as string);
    if (params.availability) queryParams.set("availability", params.availability as string);
    
    if (params.skills) {
      const skills = Array.isArray(params.skills) ? params.skills.join(",") : params.skills;
      queryParams.set("skills", skills);
    }
    
    queryParams.set("page", "1");
    queryParams.set("page_size", "100");

    const fetchUrl = apiUrl 
      ? `${apiUrl}/api/v1/candidates/search?${queryParams.toString()}` 
      : `/api/v1/candidates/search?${queryParams.toString()}`;

    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(fetchUrl, {
      method: "GET",
      headers,
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Search failed:", res.status, text);
      return [];
    }

    const data = await res.json();
    
    // Support both {items: []} and direct array responses
    let items: CandidateList[] = [];
    if (data && data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (Array.isArray(data)) {
      items = data;
    }

    return items;
  } catch (err) {
    console.error("Search fetch error:", err);
    return [];
  }
}