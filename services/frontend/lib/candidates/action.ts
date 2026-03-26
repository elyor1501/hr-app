"use server";

import { revalidatePath } from "next/cache";

export async function deleteCandidate(candidateId: string) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/parsed-resumes/${candidateId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
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
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const payload = {
    candidate_status: formData.get("candidate_status") as string,
  };

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/parsed-resumes/${id}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
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


