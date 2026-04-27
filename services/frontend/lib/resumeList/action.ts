import { revalidateResumes } from "./revalidate";
import { getApiUrl, getAuthToken } from "../api-config";

const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 120000;

async function uploadBatch(batch: File[], uploadUrl: string, token: string | null): Promise<any[]> {
  const formData = new FormData();
  batch.forEach((file) => formData.append("files", file));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BATCH_TIMEOUT);

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.detail || "Failed to upload batch");
    }

    const result = await response.json();
    return Array.isArray(result) ? result : [];
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Upload timeout - files may be too large");
    }
    throw error;
  }
}

export async function uploadBulkResumes(files: File[]) {
    const BATCH_SIZE = 10
    const token = getAuthToken()
    const apiUrl = getApiUrl()
    const uploadUrl = apiUrl ? `${apiUrl}/api/v1/resumes/bulk` : "/api/v1/resumes/bulk"

    const batches: File[][] = []
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        batches.push(files.slice(i, i + BATCH_SIZE))
    }

    const uploadBatch = async (batch: File[]) => {
        const formData = new FormData()
        batch.forEach(file => formData.append("files", file))

        const res = await fetch(uploadUrl, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        })

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData?.detail || "Failed to upload batch")
        }

        return res.json()
    }

    const batchResults = await Promise.all(batches.map(batch => uploadBatch(batch)))
    const totalAccepted = batchResults.reduce((sum, r) => sum + (r.accepted || 0), 0)

    await revalidateResumes()
    return Array.from({ length: totalAccepted }, (_, i) => ({ id: i }))
}

export async function deleteResume(id: string) {
  const token = getAuthToken();
  const apiUrl = getApiUrl();
  const deleteUrl = apiUrl ? `${apiUrl}/api/v1/resumes/${id}` : `/api/v1/resumes/${id}`;

  const response = await fetch(deleteUrl, {
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
  const apiUrl = getApiUrl();
  const downloadUrl = apiUrl ? `${apiUrl}/api/v1/resumes/${id}/download` : `/api/v1/resumes/${id}/download`;

  let response = await fetch(downloadUrl, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok && fallbackFileUrl) {
    const fallbackUrl = fallbackFileUrl.startsWith("http")
      ? fallbackFileUrl
      : apiUrl ? `${apiUrl}${fallbackFileUrl}` : fallbackFileUrl;

    response = await fetch(fallbackUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
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
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export async function viewResume(id: string, fileName?: string, fallbackFileUrl?: string) {
  const token = getAuthToken();
  const apiUrl = getApiUrl();
  const viewUrl = apiUrl ? `${apiUrl}/api/v1/resumes/${id}/download` : `/api/v1/resumes/${id}/download`;

  let response = await fetch(viewUrl, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok && fallbackFileUrl) {
    const fallbackUrl = fallbackFileUrl.startsWith("http")
      ? fallbackFileUrl
      : apiUrl ? `${apiUrl}${fallbackFileUrl}` : fallbackFileUrl;

    response = await fetch(fallbackUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
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
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}