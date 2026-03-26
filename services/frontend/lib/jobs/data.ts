export type JobList = {
  id:string;
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
  status:string;
};

export async function getJob(): Promise<JobList[]> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers: HeadersInit = {
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/?page=1&page_size=100`,
      { 
        headers,
        cache: "no-store" 
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "Unable to read response");
      console.error("Failed to fetch jobs:", res.status, text);
      return [];
    }

    const data = await res.json();
    
    // Handle paginated response
    if (data && data.items && Array.isArray(data.items)) {
      return data.items;
    }
    
    // Fallback for non-paginated response
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
}

export async function getJobById(id: string) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers: HeadersInit = {
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/${id}`,
      {
        method: "GET",
        headers,
        cache: "no-store", 
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
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/match/bulk`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
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