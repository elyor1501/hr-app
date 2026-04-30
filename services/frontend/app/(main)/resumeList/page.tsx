"use client";

import AddResumeButton from "@/components/resumes/AddResumeButton";
import ResumeTable from "@/components/resumes/ResumeTable";
import { getResumes } from "@/lib/resumeList/data";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Page() {
  const [page, setPage] = useState(1);
  const [resumes, setResumes] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getResumes(page, 10).then((result) => {
      setResumes(result.items);
      setTotalPages(result.total_pages);
      setLoading(false);
    });
  }, [page]);

  return (
    <div>
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">Resume List</h1>
        <AddResumeButton />
      </div>

      {loading ? (
        <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : (
        <ResumeTable resumes={resumes} />
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