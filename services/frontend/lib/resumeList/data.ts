export type Resume = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
};

export async function getResumes(): Promise<Resume[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resumes`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch resumes");
  }

  return res.json();
}
