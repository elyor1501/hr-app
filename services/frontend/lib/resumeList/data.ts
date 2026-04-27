import { getApiUrl, getAuthToken } from "../api-config";

export type Resume = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  updated_at: string;
  raw_text:string;
};

let resumeCache: { data: Resume[]; timestamp: number } | null = null;
const CACHE_TTL = 30000;

export async function getResumes(): Promise<any[]> {
  const isServer = typeof window === "undefined";
  
  if (!isServer && resumeCache && Date.now() - resumeCache.timestamp < CACHE_TTL) {
    return resumeCache.data;
  }

  const apiUrl = getApiUrl();
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const fullUrl = apiUrl ? `${apiUrl}/api/v1/resumes/?skip=0&limit=100` : '/api/v1/resumes/?skip=0&limit=100';

  try {
    const res = await fetch(fullUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to fetch resumes:", res.status);
      return [];
    }

    const data: Resume[] = await res.json();

    const updated = data.map((resume) => ({
      ...resume,
      extraction_status:
        resume.raw_text && resume.raw_text.trim().length > 0
          ? "completed"
          : "processing",
    }));

    if (!isServer) {
      resumeCache = { data: updated, timestamp: Date.now() };
    }

    return updated;
  } catch (error) {
    console.error("Error fetching resumes:", error);
    return [];
  }
}

export function invalidateResumeCache() {
  resumeCache = null;
}