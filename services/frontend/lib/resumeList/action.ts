import { revalidateResumes } from "./revalidate";
import { getApiUrl, getAuthToken } from "../api-config";

export async function uploadBulkResumes(files: File[]) {
  const formData = new FormData();
  const token = getAuthToken();
  const apiUrl = getApiUrl();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  const uploadUrl = apiUrl ? `${apiUrl}/api/v1/resumes/bulk` : '/api/v1/resumes/bulk';

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
      throw new Error(errorData?.detail || "Failed to upload resumes");
    }

    await revalidateResumes();
    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("Upload timeout - files may be too large");
    }
    throw error;
  }
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