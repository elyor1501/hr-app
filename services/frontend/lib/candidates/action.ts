"use server";

import { revalidatePath } from "next/cache";

export async function deleteCandidate(candidateId: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/candidates/${candidateId}`,
      {
        method: "DELETE",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Delete failed:", text);
      throw new Error("Failed to delete employee");
    }

    revalidatePath("/candidates");

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function updateCandidate(formData: FormData): Promise<void> {
  const id = formData.get("id") as string;

  const skillsInput = (formData.get("skills") as string) || "";
  const skillsArray = skillsInput
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const payload = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    current_company: formData.get("current_company") as string,
    current_title: formData.get("current_title") as string,
    location: formData.get("location") as string,
    years_of_experience: Number(formData.get("years_of_experience")),
    status: (formData.get("status") as string).toLowerCase(),
    skills: skillsArray,
    linkedin_url: formData.get("linkedin_url") as string,
    resume:formData.get("resume") as string
  };

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/candidates/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Update failed:", text);
    throw new Error("Failed to update candidate");
  }

  revalidatePath("/candidates");
}



