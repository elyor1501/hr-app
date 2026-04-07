import { revalidateJobs } from "./revalidate";
import { getApiUrl } from "../api-config";

export async function deleteJob(jobId: string, token: string | null) {
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(
      `${apiUrl}/api/v1/jobs/${jobId}`,
      {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Delete failed:", text);
      throw new Error("Failed to delete job");
    }

    await revalidateJobs();

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function updateJob(formData: FormData, token: string | null): Promise<void> {
  const id = formData.get("id") as string;
  const apiUrl = getApiUrl();

  const educationInput = formData.getAll("education") as string[];

  const requiredSkills = (formData.get("required_skills") as string)
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const preferredSkills = (formData.get("preferred_skills") as string)
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const payload = {
    title: formData.get("title"),
    status: formData.get("status"),
    department: formData.get("department"),
    employment_type: formData.get("employment_type"),
    work_mode: formData.get("work_mode"),
    location: formData.get("location"),
    hiring_manager: formData.get("hiring_manager"),
    openings: Number(formData.get("openings")),
    experience_required: Number(formData.get("experience_required")),
    education: educationInput.length ? educationInput : [],
    description: formData.get("description"),
    responsibilities: formData.get("responsibilities"),
    required_skills: requiredSkills,
    preferred_skills: preferredSkills?.length ? preferredSkills : null,
    salary_range: formData.get("salary_range"),
    application_posted: formData.get("application_posted"),
    application_deadline: formData.get("application_deadline"),
  };

  const res = await fetch(
    `${apiUrl}/api/v1/jobs/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Status:", res.status);
    console.error("Update failed:", text);
    throw new Error("Failed to update job");
  }

  await revalidateJobs();
}

export async function createJob(payload: any, token: string | null) {
  const apiUrl = getApiUrl();
  const res = await fetch(
    `${apiUrl}/api/v1/jobs/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Create failed:", text);
    throw new Error("Failed to create job");
  }

  await revalidateJobs();

  return await res.json();
}