export const dynamic = "force-dynamic";
export const revalidate = 0;

import CandidatesTable from "@/components/candidate/CandidateTable";
import { CompareBar } from "@/components/candidate/CompareBar";
import { getCandidates, searchCandidates, PaginatedCandidates } from "@/lib/candidates/data";
import { getResumes } from "@/lib/resumeList/data";
import ServerPagination from "@/components/ServerPagination";
import CandidateFilters from "@/components/search/CandidateFilters";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 10;

  const q = params.q as string | undefined;
  const hasFilters = params.name || params.jobTitle || params.location || params.experienceLevel || params.availability || params.skills;

  let candidateResult: PaginatedCandidates;

  if (hasFilters) {
    candidateResult = await searchCandidates({ ...params, page, page_size: pageSize });
  } else {
    candidateResult = await getCandidates(page, pageSize, q);
  }

  const [resumeResult] = await Promise.all([
    getResumes(1, pageSize),
  ]);

  const data = candidateResult.items;
  const totalPages = candidateResult.total_pages;
  const resumes = resumeResult.items;

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2" style={{ borderColor: '#429ABD20' }}>
        <h1 className="font-semibold" style={{ color: '#429ABD' }}>Candidate List</h1>
      </div>

      <CandidatesTable data={data} resumes={resumes} />

      <ServerPagination currentPage={page} totalPages={totalPages} />

      <CompareBar />
    </div>
  );
}