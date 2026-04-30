import { getApiUrl, getAuthToken } from "../api-config";

export type Resume = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  updated_at: string;
  raw_text: string;
};

export type PaginatedResumes = {
  items: Resume[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

const CACHE_TTL = 30000;
let resumeCache: { data: PaginatedResumes; timestamp: number } | null = null;

export async function getResumes(
  page: number = 1,
  page_size: number = 10
): Promise<PaginatedResumes> {
  const isServer = typeof window === "undefined";

  if (
    !isServer &&
    resumeCache &&
    resumeCache.data.page === page &&
    resumeCache.data.page_size === page_size &&
    Date.now() - resumeCache.timestamp < CACHE_TTL
  ) {
    return resumeCache.data;
  }

  const apiUrl = getApiUrl();
  const token = getAuthToken();

  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fullUrl = apiUrl
    ? `${apiUrl}/api/v1/resumes/?page=${page}&page_size=${page_size}`
    : `/api/v1/resumes/?page=${page}&page_size=${page_size}`;

  const empty: PaginatedResumes = {
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  };

  try {
    const res = await fetch(fullUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to fetch resumes:", res.status);
      return empty;
    }

    const data: PaginatedResumes = await res.json();

    const updatedItems = data.items.map((resume) => ({
      ...resume,
      extraction_status:
        resume.raw_text && resume.raw_text.trim().length > 0
          ? "completed"
          : "processing",
    }));

    const result: PaginatedResumes = { ...data, items: updatedItems };

    if (!isServer) {
      resumeCache = { data: result, timestamp: Date.now() };
    }

    return result;
  } catch (error) {
    console.error("Error fetching resumes:", error);
    return empty;
  }
}

export function invalidateResumeCache() {
  resumeCache = null;
}