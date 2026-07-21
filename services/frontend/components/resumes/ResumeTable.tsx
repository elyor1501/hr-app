"use client";

import { DataTable } from "@/components/table/data-table";
import { columns_resume_list } from "@/components/resumes/ResumeListTableColumn";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { BulkDeleteResumesButton } from "./BulkDeleteResumesButton";
import { toast } from "sonner";
import AddResumeButton from "./AddResumeButton";

function parseSearchDate(
  value: string,
): { dateFrom: string; dateTo: string } | null {
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
  const sortBy = searchParams.get("sortBy") || "";
  const sortOrder = searchParams.get("sortOrder") || "";
  const [rowSelection, setRowSelection] = useState({});

  const applySort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy !== field) {
      params.set("sortBy", field);
      params.set("sortOrder", "asc");
    } else if (sortOrder === "asc") {
      params.set("sortOrder", "desc");
    } else {
      params.delete("sortBy");
      params.delete("sortOrder");
    }
    params.set("page", "1");
    router.push(`/resumeList?${params.toString()}`);
  };

  const columns = useMemo(() => {
    return columns_resume_list.map((col: any) => {
      if (col.accessorKey === "file_name") {
        return {
          ...col,
          header: () => (
            <div className="flex items-center justify-start gap-2 py-1">
              <Button
                variant="ghost"
                className="flex items-center gap-1 px-0 hover:bg-transparent"
                onClick={() => applySort("file_name")}
              >
                <span className="font-semibold whitespace-nowrap">
                  File Name
                </span>
                {sortBy === "file_name" ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-[#429ABD]" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-[#429ABD]" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
            </div>
          ),
        };
      }
      if (col.accessorKey === "created_at") {
        return {
          ...col,
          header: () => (
            <div className="flex items-center justify-center w-full">
              <Button
                variant="ghost"
                className="flex items-center gap-1 px-2 py-1 hover:bg-transparent"
                onClick={() => applySort("created_at")}
              >
                <span>Uploaded At</span>
                {/* {sortBy === "created_at" ? (
                  sortOrder === "asc" ? (
                    <ArrowUp className="h-3 w-3 text-[#429ABD]" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-[#429ABD]" />
                  )
                ) : (
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                )} */}
              </Button>
            </div>
          ),
        };
      }
      return col;
    });
  }, [sortBy, sortOrder]);

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

  const displayValue =
    searchParams.get("q") ||
    (searchParams.get("dateFrom")
      ? searchParams.get("dateFrom")!.split("-").reverse().join(".")
      : "");

  const onBulkDeleteSuccess = () => {
    setRowSelection({});
    router.refresh();
  };

  return (
    <DataTable
      columns={columns}
      data={resumes}
      filter={""}
      sort={""}
      manualSorting={true}
      showPagination={false}
      toolbarActions={
        <>
          <AddResumeButton />
        </>
      }
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
