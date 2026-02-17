export type CandidateList = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  current_title?: string | null;
  current_company?: string | null;
  years_of_experience?: number | null;
  location?: string | null;
  linkedin_url?: string | null;
  status?: string | null;
  skills?: string[] | null;
  resume?: string | null;
};

export async function getCandidates(): Promise<CandidateList[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/candidates?skip=0&limit=100`,
      { cache: "no-store" }
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
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/candidates/${id}`,
      {
        method: "GET",
        cache: "no-store", 
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "Unable to read response");
      console.error(`Failed to fetch candidate ${id}:`, res.status, text);
      throw new Error(`Failed to fetch candidate: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("getCandidateById error:", error);
    throw error;
  }
}
