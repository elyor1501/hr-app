"use client";

import { DataTable } from "@/components/table/data-table";
import { columns_candidate_list } from "@/components/candidate/CandidateListTableColumn";
import { ResumeExtractionToast } from "./ExtractionMsg";
import { useRouter, useSearchParams } from "next/navigation";

function CandidateStatusTracker({ resumes }: { resumes: any[] }) {
  return (
    <>
      <ResumeExtractionToast resumes={resumes} />
    </>
  );
}

export default function CandidatesTable({ data, resumes }: { data: any[], resumes: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    params.set("page", "1");
    router.push(`/candidates?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <CandidateStatusTracker resumes={resumes} />

      <div className="animate-in fade-in duration-500">
        <DataTable
          columns={columns_candidate_list}
          data={data}
          filter={"first_name"}
          sort={""}
          showPagination={false}
          globalFilterValue={q}
          onGlobalFilterChange={handleSearch}
          searchPlaceholder="Search candidates..."
        />
      </div>
    </div>
  );
}