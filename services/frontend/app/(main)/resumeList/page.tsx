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

  const result = await getResumes(page, 10, q, dateFrom, dateTo);
  const resumes = result.items;
  const totalPages = result.total_pages;

  return (
    <div>
      <div
        className="flex items-center justify-between border p-4 rounded-lg mt-2"
        style={{ borderColor: "#429ABD20" }}
      >
        <h1 className="font-semibold" style={{ color: "#429ABD" }}>
          Resume List
        </h1>
        <AddResumeButton />
      </div>

      <ResumeTable resumes={resumes} />

      <ServerPagination currentPage={page} totalPages={totalPages} />
    </div>
  );
}