export async function uploadBulkResumes(files: File[]) {
  const formData = new FormData();
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  files.forEach((file) => {
    formData.append("files", file);
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resumes/bulk`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.detail || "Failed to upload resumes");
    }

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
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resumes/${id}`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.detail || "Failed to delete resume");
  }

  return true;
}

export async function downloadResume(id: string, fileName?: string, fallbackFileUrl?: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  let downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resumes/${id}/download`;

  let response = await fetch(downloadUrl, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
  });

  if (!response.ok && fallbackFileUrl) {
    const fallbackUrl = fallbackFileUrl.startsWith("http") 
      ? fallbackFileUrl 
      : `${process.env.NEXT_PUBLIC_API_URL}${fallbackFileUrl}`;
    
    response = await fetch(fallbackUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
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
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  let downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resumes/${id}/download`;

  let response = await fetch(downloadUrl, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
  });

  if (!response.ok && fallbackFileUrl) {
    const fallbackUrl = fallbackFileUrl.startsWith("http") 
      ? fallbackFileUrl 
      : `${process.env.NEXT_PUBLIC_API_URL}${fallbackFileUrl}`;
    
    response = await fetch(fallbackUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
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