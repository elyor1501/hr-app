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
  created_at: string;
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

const CACHE_TTL = 0;
const DETAIL_CACHE_TTL = 300000;
let candidatesCache: { data: PaginatedCandidates; timestamp: number; q?: string } | null = null;
let candidateByIdCache: Map<string, { data: any; timestamp: number }> = new Map();

export async function getCandidates(
  page: number = 1,
  page_size: number = 10,
  q?: string
): Promise<PaginatedCandidates> {
  const apiUrl = getApiUrl();
  const token = getAuthToken();
  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: page_size.toString(),
  });
  if (q) queryParams.set("q", q);

  const fetchUrl = apiUrl
    ? `${apiUrl}/api/v1/candidates?${queryParams.toString()}`
    : `/api/v1/candidates?${queryParams.toString()}`;

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
      cache: "no-store",
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

    return result;
  } catch (err) {
    console.error("Fetch error:", err);
    return empty;
  }
}

export function invalidateCandidatesCache() {
  candidatesCache = null;
  candidateByIdCache.clear();
}

export async function getCandidateById(id: string) {
  const isServer = typeof window === "undefined";

  if (!isServer && candidateByIdCache.has(id)) {
    const cached = candidateByIdCache.get(id)!;
    if (Date.now() - cached.timestamp < DETAIL_CACHE_TTL) {
      return cached.data;
    }
  }

  const apiUrl = getApiUrl();
  const token = getAuthToken();

  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const profileUrl = apiUrl
    ? `${apiUrl}/api/v1/candidates/${id}/profile`
    : `/api/v1/candidates/${id}/profile`;

  try {
    const res = await fetch(profileUrl, {
      method: "GET",
      headers,
      next: { revalidate: 300 },
    });

    if (res.status === 404) {
      return { status: "processing" };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "Unable to read response");
      console.error("Fetch candidate failed:", res.status, text);
      return { status: "processing" };
    }

    const result = await res.json();

    if (!isServer) {
      candidateByIdCache.set(id, { data: result, timestamp: Date.now() });
    }

    return result;
  } catch (error) {
    console.error("getCandidateById error:", error);
    return { status: "processing" };
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

export async function searchCandidates(params: any): Promise<PaginatedCandidates> {
  try {
    const apiUrl = getApiUrl();
    const token = getAuthToken();

    const page = params.page ? Number(params.page) : 1;
    const page_size = params.page_size ? Number(params.page_size) : 10;

    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set("q", params.q);
    if (params.name) queryParams.set("name", params.name as string);
    if (params.jobTitle) queryParams.set("job_title", params.jobTitle as string);
    if (params.location) queryParams.set("location", params.location as string);
    if (params.experienceLevel) {
      const levels = Array.isArray(params.experienceLevel)
        ? params.experienceLevel.join(",")
        : params.experienceLevel;
      queryParams.set("experience_level", levels);
    }
    if (params.availability) {
      const opts = Array.isArray(params.availability)
        ? params.availability.join(",")
        : params.availability;
      queryParams.set("availability", opts);
    }
    if (params.skills) {
      const skills = Array.isArray(params.skills)
        ? params.skills.join(",")
        : params.skills;
      queryParams.set("skills", skills);
    }
    if (params.dateFrom) queryParams.set("dateFrom", params.dateFrom as string);
    if (params.dateTo) queryParams.set("dateTo", params.dateTo as string);

    queryParams.set("page", page.toString());
    queryParams.set("page_size", page_size.toString());

    const fetchUrl = apiUrl
      ? `${apiUrl}/api/v1/candidates/search?${queryParams.toString()}`
      : `/api/v1/candidates/search?${queryParams.toString()}`;

    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const empty: PaginatedCandidates = {
      items: [],
      total: 0,
      page,
      page_size,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    };

    const res = await fetch(fetchUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Search failed:", res.status, text);
      return empty;
    }

    const data = await res.json();

    return {
      items: data.items ?? [],
      total: data.total ?? 0,
      page: data.page ?? page,
      page_size: data.page_size ?? page_size,
      total_pages: data.total_pages ?? 1,
      has_next: data.has_next ?? false,
      has_previous: data.has_previous ?? false,
    };
  } catch (err) {
    console.error("Search fetch error:", err);
    return {
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    };
  }
}