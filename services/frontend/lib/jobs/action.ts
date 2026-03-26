"use server";

import { revalidatePath } from "next/cache";

export async function deleteJob(jobId: string) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/${jobId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Delete failed:", text);
      throw new Error("Failed to delete job");
    }

    revalidatePath("/jobs");

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function updateJob(formData: FormData): Promise<void> {
  const id = formData.get("id") as string;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

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
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
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

  revalidatePath("/jobs");
}