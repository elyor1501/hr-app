"use client";

import { DataTable } from "@/components/table/data-table";
import { columns_resume_list } from "@/components/resumes/ResumeListTableColumn";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BulkDeleteResumesButton } from "./BulkDeleteResumesButton";

export default function ResumeTable({ resumes }: { resumes: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [rowSelection, setRowSelection] = useState({});

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    params.set("page", "1");
    router.push(`/resumeList?${params.toString()}`);
  };

  const onBulkDeleteSuccess = () => {
    setRowSelection({});
    router.refresh();
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
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
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
      onRowClick={(row) => {
        if (!row.file_url) return;

        const ext = row.file_url.split(".").pop()?.toLowerCase();

        if (ext === "pdf") {
          window.open(row.file_url, "_blank");
        } else {
          const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(row.file_url)}&embedded=true`;
          window.open(viewerUrl, "_blank");
        }
      }}
    />
  );
}
