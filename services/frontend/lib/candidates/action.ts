import { revalidateCandidates } from "./revalidate";

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
      throw new Error("Failed to delete candidate");
    }

    await revalidateCandidates();

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function updateCandidate(formData: FormData): Promise<void> {
  const id = formData.get("id") as string;
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

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
    // status: (formData.get("status") as string).toLowerCase(),
    skills: skillsArray,
    linkedin_url: formData.get("linkedin_url") as string,
    resume:formData.get("resume") as string,   
    candidate_status: formData.get("candidate_status") as string,
  };

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/parsed-resumes/${id}`,
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

  await revalidateCandidates();
}

export async function createCandidate(formData: FormData) {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/candidates/`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: formData,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Create failed:", text);
    throw new Error("Failed to create candidate");
  }

  await revalidateCandidates();

  return await res.json();
}


