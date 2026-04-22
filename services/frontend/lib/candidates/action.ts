import { revalidateCandidates } from "./revalidate";
import { getApiUrl, getAuthToken } from "../api-config";

export async function deleteCandidate(candidateId: string) {
  try {
    const token = getAuthToken();
    const apiUrl = getApiUrl();
    const deleteUrl = apiUrl ? `${apiUrl}/api/v1/candidates/${candidateId}` : `/api/v1/candidates/${candidateId}`;

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

  const updateUrl = apiUrl ? `${apiUrl}/api/v1/candidates/${id}` : `/api/v1/candidates/${id}`;

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

export async function setPrimaryResume(candidateId: string, resumeId: string) {
  const token = getAuthToken();
  const apiUrl = getApiUrl();
  const primaryUrl = apiUrl ? `${apiUrl}/api/v1/candidates/${candidateId}/cvs/${resumeId}/set-primary` : `/api/v1/candidates/${candidateId}/cvs/${resumeId}/set-primary`;

  const res = await fetch(primaryUrl, {
    method: "PATCH",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Set primary failed:", text);
    throw new Error("Failed to set primary resume");
  }

  await revalidateCandidates();
  return { success: true };
}

export async function deleteResume(candidateId: string, resumeId: string) {
  const token = getAuthToken();
  const apiUrl = getApiUrl();
  const deleteUrl = apiUrl ? `${apiUrl}/api/v1/candidates/${candidateId}/cvs/${resumeId}` : `/api/v1/candidates/${candidateId}/cvs/${resumeId}`;

  const res = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Delete resume failed:", text);
    throw new Error("Failed to delete resume");
  }

  await revalidateCandidates();
  return { success: true };
}

export async function deleteAttachment(candidateId: string, attachmentId: string) {
  const token = getAuthToken();
  const apiUrl = getApiUrl();
  const deleteUrl = apiUrl ? `${apiUrl}/api/v1/candidates/${candidateId}/attachments/${attachmentId}` : `/api/v1/candidates/${candidateId}/attachments/${attachmentId}`;

  const res = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Delete attachment failed:", text);
    throw new Error("Failed to delete attachment");
  }

  await revalidateCandidates();
  return { success: true };
}

export async function uploadAttachment(candidateId: string, formData: FormData) {
  const token = getAuthToken();
  const apiUrl = getApiUrl();
  const uploadUrl = apiUrl ? `${apiUrl}/api/v1/candidates/${candidateId}/attachments` : `/api/v1/candidates/${candidateId}/attachments`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Upload attachment failed:", text);
    throw new Error("Failed to upload attachment");
  }

  await revalidateCandidates();
  return await res.json();
}