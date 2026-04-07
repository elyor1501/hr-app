import { revalidateCandidates } from "./revalidate";
import { getApiUrl, getAuthToken } from "../api-config";

export async function deleteCandidate(candidateId: string) {
  try {
    const token = getAuthToken();
    const apiUrl = getApiUrl();
    const deleteUrl = apiUrl ? `${apiUrl}/api/v1/parsed-resumes/${candidateId}` : `/api/v1/parsed-resumes/${candidateId}`;

    const res = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

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
  const token = getAuthToken();
  const apiUrl = getApiUrl();

  const payload = {
    candidate_status: formData.get("candidate_status") as string,
  };

  const updateUrl = apiUrl ? `${apiUrl}/api/v1/parsed-resumes/${id}/status` : `/api/v1/parsed-resumes/${id}/status`;

  const res = await fetch(updateUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Update failed:", text);
    throw new Error("Failed to update candidate");
  }

  await revalidateCandidates();
}

export async function createCandidate(formData: FormData) {
  const token = getAuthToken();
  const apiUrl = getApiUrl();
  const createUrl = apiUrl ? `${apiUrl}/api/v1/candidates/` : `/api/v1/candidates/`;

  const res = await fetch(createUrl, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Create failed:", text);
    throw new Error("Failed to create candidate");
  }

  await revalidateCandidates();

  return await res.json();
}