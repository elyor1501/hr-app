import CandidatesTable from "@/components/candidate/CandidateTable";
import { CompareBar } from "@/components/candidate/CompareBar";
import { getCandidates } from "@/lib/candidates/data";
import { getResumes } from "@/lib/resumeList/data";
import ServerPagination from "@/components/ServerPagination";
import CandidateFilters from "@/components/candidate/CandidateFilters";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 10;

  const [candidateResult, resumeResult] = await Promise.all([
    getCandidates(page, pageSize),
    getResumes(1, pageSize),
  ]);

  const data = candidateResult.items;
  const totalPages = candidateResult.total_pages;
  const resumes = resumeResult.items;

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">Candidate List</h1>
      </div>

      <div className="py-4 mt-2 mb-2 bg-gray-50 rounded-lg">
        <CandidateFilters />
      </div>

      <CandidatesTable data={data} resumes={resumes} />

      <ServerPagination currentPage={page} totalPages={totalPages} />

      <CompareBar />
    </div>
  );
}
