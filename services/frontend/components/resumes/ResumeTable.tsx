"use client";

import { DataTable } from "@/components/table/data-table";
import { columns_resume_list } from "@/components/resumes/ResumeListTableColumn";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BulkDeleteResumesButton } from "./BulkDeleteResumesButton";
import { toast } from "sonner";

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

export default function ResumeTable({ resumes }: { resumes: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [rowSelection, setRowSelection] = useState({});

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

    router.push(`/resumeList?${params.toString()}`);
  };

  const displayValue = searchParams.get("q") ||
    (searchParams.get("dateFrom")
      ? searchParams.get("dateFrom")!.split("-").reverse().join(".")
      : "");

  const onBulkDeleteSuccess = () => {
    setRowSelection({});
    router.refresh();
  };

  return (
    <DataTable
      columns={columns_resume_list}
      data={resumes}
      filter={""}
      sort={""}
      showPagination={false}
      globalFilterValue={displayValue}
      onGlobalFilterChange={handleSearch}
      searchPlaceholder="Search resumes..."
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      onRowClick={(row: any) => {
        const fileUrl = row.file_url;

        if (!fileUrl) {
          toast.error("File URL not available");
          return;
        }

        const extension = fileUrl.split(".").pop()?.toLowerCase();

        if (extension === "pdf") {
          window.open(fileUrl, "_blank");
        } else {
          const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
            fileUrl,
          )}&embedded=true`;
          window.open(viewerUrl, "_blank");
        }
      }}
      renderBulkActions={(table) => {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const selectedIds = selectedRows.map((row: any) => row.original.id);

        if (selectedIds.length === 0) return null;

        return (
          <BulkDeleteResumesButton
            selectedIds={selectedIds}
            onSuccessAction={onBulkDeleteSuccess}
          />
        );
      }}
    />
  );
}