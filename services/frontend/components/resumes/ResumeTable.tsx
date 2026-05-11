"use client";

import { DataTable } from "@/components/table/data-table";
import { columns_resume_list } from "@/components/resumes/ResumeListTableColumn";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResumeTable({ resumes }: { resumes: any[] }) {
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
    params.set("page", "1"); // Reset to page 1 on new search
    router.push(`/resumeList?${params.toString()}`);
  };

  return (
    <DataTable
      columns={columns_resume_list}
      data={resumes}
      filter={"name"}
      sort={""}
      showPagination={false}
      globalFilterValue={q}
      onGlobalFilterChange={handleSearch}
      searchPlaceholder="Search resumes..."
    />
  );
}