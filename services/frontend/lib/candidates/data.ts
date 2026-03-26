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

export async function getCandidates(): Promise<CandidateList[]> {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    const headers: HeadersInit = {
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/parsed-resumes/?skip=0&limit=100`,
      {
        headers,
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "Unable to read response");
      console.error("Failed to fetch candidates:", res.status, text);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
}

export async function getCandidateById(id: string) {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    const headers: HeadersInit = {
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/parsed-resumes/${id}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    if (res.status === 404) {
      return { status: "processing" };
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("Fetch candidate failed:", res.status, text);
      return null;
    }

    const data = await res.json();

    if (Array.isArray(data)) {
      return data[0];
    }

    return data;
  } catch (error) {
    console.error("getCandidateById error:", error);
    return null;
  }
}

export async function matchJobs(resumeId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/match/candidate-to-jobs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidate_id: resumeId,
          top_k: 10,
          min_score: 0.0,
        }),
      }
    );

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