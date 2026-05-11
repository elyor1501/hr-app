"use client";

import { DataTable } from "@/components/table/data-table";
import { columns_job_list } from "./JobListTableColumn";
import { useRouter, useSearchParams } from "next/navigation";

export default function JobTable({ data }: { data: any[] }) {
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
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <DataTable
      columns={columns_job_list}
      data={data}
      filter={"department"}
      sort={""}
      globalFilterValue={q}
      onGlobalFilterChange={handleSearch}
      searchPlaceholder="Search jobs..."
    />
  );
}
