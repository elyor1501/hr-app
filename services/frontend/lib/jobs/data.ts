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
};

export async function getJob(): Promise<JobList[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs?skip=0&limit=100`,
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

export async function getJobById(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/${id}`,
      {
        method: "GET",
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