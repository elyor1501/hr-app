"use server";
import { revalidateCandidates } from "./revalidate";
import { getApiUrl } from "../api-config";
import { getCandidateById } from "./data";

export async function deleteCandidate(candidateId: string) {
  try {
    const apiUrl = getApiUrl();
    const deleteUrl = apiUrl
      ? `${apiUrl}/api/v1/candidates/${candidateId}`
      : `/api/v1/candidates/${candidateId}`;

    const res = await fetch(deleteUrl, {
      method: "DELETE",
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
  const token = (formData.get("_token") as string) || "";
  const apiUrl = getApiUrl();

  const payload: Record<string, any> = {};

  const status = formData.get("status");
  if (status) payload.status = status;

  const hourly_rate = formData.get("hourly_rate");
  if (hourly_rate !== null && hourly_rate !== "") {
    const parsed = parseFloat(hourly_rate as string);
    if (!isNaN(parsed)) payload.hourly_rate = parsed;
  }

  const rate_type = formData.get("rate_type");
  if (rate_type) payload.rate_type = rate_type;

  const currency = formData.get("currency");
  if (currency) payload.currency = currency;

  const vendor = formData.get("vendor");
  if (vendor !== null && vendor !== "") payload.vendor = vendor as string;

  const proposed_rate = formData.get("proposed_rate");
  if (proposed_rate !== null && proposed_rate !== "") {
    const parsed = parseFloat(proposed_rate as string);
    if (!isNaN(parsed)) payload.proposed_rate = parsed;
  }

  const proposed_rate_type = formData.get("proposed_rate_type");
  if (proposed_rate_type) payload.proposed_rate_type = proposed_rate_type;

  const proposed_currency = formData.get("proposed_currency");
  if (proposed_currency) payload.proposed_currency = proposed_currency;

  const updateUrl = apiUrl
    ? `${apiUrl}/api/v1/candidates/${id}`
    : `/api/v1/candidates/${id}`;

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
  const apiUrl = getApiUrl();
  const createUrl = apiUrl
    ? `${apiUrl}/api/v1/candidates/`
    : `/api/v1/candidates/`;

  const res = await fetch(createUrl, {
    method: "POST",
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
  const apiUrl = getApiUrl();
  const primaryUrl = apiUrl
    ? `${apiUrl}/api/v1/candidates/${candidateId}/cvs/${resumeId}/set-primary`
    : `/api/v1/candidates/${candidateId}/cvs/${resumeId}/set-primary`;

  const res = await fetch(primaryUrl, {
    method: "PATCH",
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
  const apiUrl = getApiUrl();
  const deleteUrl = apiUrl
    ? `${apiUrl}/api/v1/candidates/${candidateId}/cvs/${resumeId}`
    : `/api/v1/candidates/${candidateId}/cvs/${resumeId}`;

  const res = await fetch(deleteUrl, {
    method: "DELETE",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Delete resume failed:", text);
    throw new Error("Failed to delete resume");
  }

  await revalidateCandidates();
  return { success: true };
}

export async function deleteAttachment(
  candidateId: string,
  attachmentId: string
) {
  const apiUrl = getApiUrl();
  const deleteUrl = apiUrl
    ? `${apiUrl}/api/v1/candidates/${candidateId}/attachments/${attachmentId}`
    : `/api/v1/candidates/${candidateId}/attachments/${attachmentId}`;

  const res = await fetch(deleteUrl, {
    method: "DELETE",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Delete attachment failed:", text);
    throw new Error("Failed to delete attachment");
  }

  await revalidateCandidates();
  return { success: true };
}

export async function uploadAttachment(
  candidateId: string,
  formData: FormData,
  token: string
) {
  const apiUrl = getApiUrl();
  const uploadUrl = apiUrl
    ? `${apiUrl}/api/v1/candidates/${candidateId}/attachments`
    : `/api/v1/candidates/${candidateId}/attachments`;

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

export async function generateDeloitteResume(
  candidateId: string,
  cvId: string
) {
  const apiUrl = getApiUrl();
  const url = apiUrl
    ? `${apiUrl}/api/v1/candidates/${candidateId}/cvs/${cvId}/generate-deloitte`
    : `/api/v1/candidates/${candidateId}/cvs/${cvId}/generate-deloitte`;

  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Generate Deloitte failed:", text);
    throw new Error("Failed to generate Deloitte resume");
  }

  await revalidateCandidates();
  const updatedCandidate = await getCandidateById(candidateId);
  return updatedCandidate;
}

export async function deleteDeloitteResume(
  candidateId: string,
  cvId: string
) {
  const apiUrl = getApiUrl();
  const url = apiUrl
    ? `${apiUrl}/api/v1/candidates/${candidateId}/cvs/${cvId}/deloitte`
    : `/api/v1/candidates/${candidateId}/cvs/${cvId}/deloitte`;

  const res = await fetch(url, {
    method: "DELETE",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Delete Deloitte failed:", text);
    throw new Error("Failed to delete Deloitte resume");
  }

  await revalidateCandidates();
  const updatedCandidate = await getCandidateById(candidateId);
  return updatedCandidate;
}