"use client";

import { getCandidates } from "@/lib/candidates/data";
import { DataTable } from "@/components/table/data-table";
import { columns_candidate_list } from "@/components/candidate/CandidateListTableColumn";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

// import { SmartAutoRefresh } from "./Autorefresh";

export default function CandidatesTable() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCandidates(page, 10).then((result) => {
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
        <div className="animate-in fade-in duration-500">
          <DataTable
            columns={columns_candidate_list}
            data={data}
            filter={"first_name"}
            sort={""}
            showPagination={false}
          />
        </div>
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