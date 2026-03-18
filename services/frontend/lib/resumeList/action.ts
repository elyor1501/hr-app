export async function uploadBulkResumes(files: File[]) {
  const formData = new FormData();
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resumes/bulk`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.detail || "Failed to upload resumes"
    );
  }

  return response.json();
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
    throw new Error(
      errorData?.detail || "Failed to delete resume"
    );
  }

  return true;
}
