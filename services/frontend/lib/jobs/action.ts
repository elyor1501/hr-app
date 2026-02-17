"use server";

import { revalidatePath } from "next/cache";

export async function deleteJob(jobId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/${jobId}`,
      {
        method: "DELETE",
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

  const educationInput = formData.getAll("education") as string[];

  const payload = {
    title: formData.get("title") as string,
    department: formData.get("department") as string,
    employment_type: formData.get("employment_type") as string,
    work_mode: formData.get("work_mode") as string,
    location: formData.get("location") as string,
    hiring_manager: formData.get("hiring_manager") as string,
    openings: Number(formData.get("openings")),
    experience_required: Number(formData.get("experience_required")),
    education: educationInput.length ? educationInput : [],

    description: formData.get("description") as string,
    responsibilities: formData.get("responsibilities") as string,   
    required_skills: formData.get("required_skills") as string,
    preferred_skills: formData.get("preferred_skills") as string,    
    salary_range: formData.get("salary_range") as string,   
    application_posted: formData.get("application_posted") as string,
    application_deadline: formData.get("application_deadline") as string,
  };

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Update failed:", text);
    throw new Error("Failed to update job");
  }

  revalidatePath("/jobs");
}
