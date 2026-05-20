"use client";

import { DataTable } from "@/components/table/data-table";
import { columns_request_list } from "../requests/RequestListTableColumn";
import { useRouter, useSearchParams } from "next/navigation";

export default function RequestTable({ data }: { data: any[] }) {
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
    router.push(`/requests?${params.toString()}`);
  };

  return (
    <DataTable
      columns={columns_request_list}
      data={data}
      filter={"department"}
      sort={""}
      showPagination={false}
      globalFilterValue={q}
      onGlobalFilterChange={handleSearch}
      searchPlaceholder="Search requests..."
      onRowClick={(row) => router.push(`/requests/${row.id}`)}
    />
  );
}