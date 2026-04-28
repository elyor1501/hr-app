import { revalidateResumes } from "./revalidate";
import { getAuthToken } from "../api-config";

const BATCH_SIZE = 5;
const BATCH_TIMEOUT = 180000;

function getBackendUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://backend:8000";
}

async function uploadSingleBatch(batch: File[], token: string | null): Promise<any> {
  const formData = new FormData();
  batch.forEach((file) => formData.append("files", file));

  const controller = new AbortController();

  try {
    const response = await fetch(`${getBackendUrl()}/api/v1/resumes/bulk`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.detail || "Failed to upload batch");
    }

    return response.json();
  } catch (error: any) {
    throw error;
  }
}

export async function uploadBulkResumes(files: File[]) {
  const token = getAuthToken();

  const batches: File[][] = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    batches.push(files.slice(i, i + BATCH_SIZE));
  }

  let totalAccepted = 0;

  for (const batch of batches) {
    const result = await uploadSingleBatch(batch, token);
    totalAccepted += result?.accepted || 0;
  }

  await revalidateResumes();
  return { accepted: totalAccepted };
}

export async function deleteResume(id: string) {
  const token = getAuthToken();

  const response = await fetch(`${getBackendUrl()}/api/v1/resumes/${id}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.detail || "Failed to delete resume");
  }

  await revalidateResumes();
  return true;
}

export async function downloadResume(id: string, fileName?: string, fallbackFileUrl?: string) {
  const token = getAuthToken();

  let response = await fetch(`${getBackendUrl()}/api/v1/resumes/${id}/download`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok && fallbackFileUrl) {
    response = await fetch(
      fallbackFileUrl.startsWith("http")
        ? fallbackFileUrl
        : `${getBackendUrl()}${fallbackFileUrl}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
  }

  if (!response.ok) throw new Error("Failed to download resume");

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName || "resume.pdf");
  document.body.appendChild(link);
  link.click();
  if (link.parentNode) {
    link.parentNode.removeChild(link);
  }
}

export async function viewResume(id: string, fileName?: string, fallbackFileUrl?: string) {
  const token = getAuthToken();

  let response = await fetch(`${getBackendUrl()}/api/v1/resumes/${id}/download`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok && fallbackFileUrl) {
    response = await fetch(
      fallbackFileUrl.startsWith("http")
        ? fallbackFileUrl
        : `${getBackendUrl()}${fallbackFileUrl}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
  }

  if (!response.ok) throw new Error("Failed to fetch resume for viewing");

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  if (blob.type === "application/pdf") {
    window.open(url, "_blank");
  } else {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName || "resume.pdf");
    document.body.appendChild(link);
    link.click();
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
  }
}