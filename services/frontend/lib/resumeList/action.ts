import { revalidateResumes } from "./revalidate";
import { getApiUrl, getAuthToken } from "../api-config";

const BATCH_TIMEOUT = 180000;
const MAX_BATCH_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_CONCURRENT_UPLOADS = 3;

const getApi = getApiUrl();

function createBatches(files: File[]): File[][] {
  const batches: File[][] = [];
  let currentBatch: File[] = [];
  let currentBatchSize = 0;

  for (const file of files) {
    if (
      currentBatch.length > 0 &&
      currentBatchSize + file.size > MAX_BATCH_SIZE_BYTES
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchSize = 0;
    }

    if (file.size > MAX_BATCH_SIZE_BYTES) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentBatchSize = 0;
      }
      batches.push([file]);
      continue;
    }

    currentBatch.push(file);
    currentBatchSize += file.size;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

async function uploadSingleBatch(batch: File[], token: string | null): Promise<any> {
  const formData = new FormData();
  batch.forEach((file) => formData.append("files", file));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BATCH_TIMEOUT);

  try {
    const response = await fetch(`${getApi}/api/v1/resumes/bulk`, {
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

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Upload timeout - files may be too large");
    }
    throw error;
  }
}

async function uploadWithConcurrency(
  batches: File[][],
  token: string | null,
  concurrency: number
): Promise<any[]> {
  const results: any[] = [];
  let index = 0;

  async function worker() {
    while (index < batches.length) {
      const currentIndex = index++;
      const result = await uploadSingleBatch(batches[currentIndex], token);
      results[currentIndex] = result;
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, batches.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

export async function uploadBulkResumes(files: File[]) {
  const token = getAuthToken();
  const batches = createBatches(files);

  const results = await uploadWithConcurrency(batches, token, MAX_CONCURRENT_UPLOADS);

  const totalAccepted = results.reduce((sum, r) => sum + (r?.accepted || 0), 0);

  await revalidateResumes();
  return { accepted: totalAccepted };
}

export async function deleteResume(id: string) {
  const token = getAuthToken();

  const response = await fetch(`${getApi}/api/v1/resumes/${id}`, {
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

export async function bulkDeleteResumes(ids: string[]) {
  const token = getAuthToken();

  const response = await fetch(`${getApi}/api/v1/resumes/bulk`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.detail || "Failed to delete resumes");
  }

  const result = await response.json();
  await revalidateResumes();
  return result;
}

export async function downloadResume(id: string, fileName?: string, fallbackFileUrl?: string) {
  const token = getAuthToken();

  let response = await fetch(`${getApi}/api/v1/resumes/${id}/download`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok && fallbackFileUrl) {
    response = await fetch(
      fallbackFileUrl.startsWith("http")
        ? fallbackFileUrl
        : `${getApi}${fallbackFileUrl}`,
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
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export async function viewResume(id: string, fileName?: string, fallbackFileUrl?: string) {
  const token = getAuthToken();

  let response = await fetch(`${getApi}/api/v1/resumes/${id}/download`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok && fallbackFileUrl) {
    response = await fetch(
      fallbackFileUrl.startsWith("http")
        ? fallbackFileUrl
        : `${getApi}${fallbackFileUrl}`,
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
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}