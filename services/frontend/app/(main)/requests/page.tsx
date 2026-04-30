"use client";

import { ImportJobButton } from "@/components/requests/ImportJobButton";
import RequestTable from "@/components/requests/RequestTable";
import { getRequests } from "@/lib/requests/data";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Page() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRequests(page, 10).then((result) => {
      setData(result);
      setHasNext(result.length === 10);
      setLoading(false);
    });
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">List</h1>
        <div className="flex items-center gap-2">
          <ImportJobButton />
        </div>
      </div>

      {loading ? (
        <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : (
        <RequestTable data={data} />
      )}

      <div className="flex items-center justify-center space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
        >
          <ArrowLeft />
        </Button>
        <span className="text-sm">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasNext || loading}
        >
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}