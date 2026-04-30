"use client";

import { DataTable } from "@/components/table/data-table";
import { columns_resume_list } from "@/components/resumes/ResumeListTableColumn";
import { getResumes } from "@/lib/resumeList/data";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function ResumeTable() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getResumes(page, 10).then((result) => {
      setData(result.items);
      setTotalPages(result.total_pages);
      setLoading(false);
    });
  }, [page]);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : (
        <DataTable
          columns={columns_resume_list}
          data={data}
          filter={"name"}
          sort={""}
          showPagination={false}
        />
      )}
      <div className="flex items-center justify-center space-x-2 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
        >
          <ArrowLeft />
        </Button>
        <span className="text-sm">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || loading}
        >
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}