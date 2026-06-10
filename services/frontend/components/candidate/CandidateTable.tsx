"use client";

import { DataTable } from "@/components/table/data-table";
import { columns_candidate_list } from "@/components/candidate/CandidateListTableColumn";
import { useRouter, useSearchParams } from "next/navigation";

function parseSearchDate(value: string): { dateFrom: string; dateTo: string } | null {
  const ddmmyyyy = value.match(/^(\d{2})[.\-\/](\d{2})[.\-\/](\d{4})$/);
  if (ddmmyyyy) {
    const formatted = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
    return { dateFrom: formatted, dateTo: formatted };
  }

  const yyyymmdd = value.match(/^(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})$/);
  if (yyyymmdd) {
    const formatted = `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;
    return { dateFrom: formatted, dateTo: formatted };
  }

  return null;
}

export default function CandidatesTable({ data, resumes }: { data: any[], resumes: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("q");
    params.delete("dateFrom");
    params.delete("dateTo");
    params.set("page", "1");

    if (value) {
      const dateResult = parseSearchDate(value.trim());
      if (dateResult) {
        params.set("dateFrom", dateResult.dateFrom);
        params.set("dateTo", dateResult.dateTo);
      } else {
        params.set("q", value);
      }
    }

    router.push(`/candidates?${params.toString()}`);
  };

  const displayValue = searchParams.get("q") ||
    (searchParams.get("dateFrom")
      ? searchParams.get("dateFrom")!.split("-").reverse().join(".")
      : "");

  return (
    <div className="space-y-4">
      <div className="animate-in fade-in duration-500">
        <DataTable
          columns={columns_candidate_list}
          data={data}
          filter={""}
          sort={""}
          showPagination={false}
          globalFilterValue={displayValue}
          onGlobalFilterChange={handleSearch}
          searchPlaceholder="Search candidates or type date (DD.MM.YYYY)..."
          onRowClick={(row: any) => {
            router.push(`/candidates/${row.id}`);
          }}
        />
      </div>
    </div>
  );
}