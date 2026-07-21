import AddResumeButton from "@/components/resumes/AddResumeButton";
import ResumeTable from "@/components/resumes/ResumeTable";
import { getResumes } from "@/lib/resumeList/data";
import ServerPagination from "@/components/ServerPagination";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const q = params.q as string | undefined;
  const dateFrom = params.dateFrom as string | undefined;
  const dateTo = params.dateTo as string | undefined;
  const sortBy = params.sortBy as string | undefined;
  const sortOrder = params.sortOrder as string | undefined;

  const result = await getResumes(page, 10, q, dateFrom, dateTo, sortBy, sortOrder);
  const resumes = result.items;
  const totalPages = result.total_pages;

  return (
    <div>
      <ResumeTable resumes={resumes} />

      <ServerPagination currentPage={page} totalPages={totalPages} />
    </div>
  );
}