export type Resume = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  updated_at:string;
};

export async function getResumes(): Promise<Resume[]> {
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
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch resumes");
  }

  return res.json();
}
