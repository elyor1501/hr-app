export type Resume = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  updated_at: string;
};

let resumeCache: { data: Resume[]; timestamp: number } | null = null;
const CACHE_TTL = 30000;

export async function getResumes(): Promise<Resume[]> {
  if (resumeCache && Date.now() - resumeCache.timestamp < CACHE_TTL) {
    return resumeCache.data;
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: HeadersInit = {
    "ngrok-skip-browser-warning": "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resumes/?skip=0&limit=100`,
    {
      method: "GET",
      headers,
      next: { revalidate: 30 },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch resumes");
  }

  const data = await res.json();
  resumeCache = { data, timestamp: Date.now() };
  return data;
}

export function invalidateResumeCache() {
  resumeCache = null;
}