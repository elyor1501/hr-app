"use client";

import CandidatesTable from "@/components/candidate/CandidateTable";
import { CompareBar } from "@/components/candidate/CompareBar";
import { getCandidates } from "@/lib/candidates/data";
import { getResumes } from "@/lib/resumeList/data";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function Page() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCandidates(page, 10),
      getResumes(1, 10),
    ]).then(([candidateResult, resumeResult]) => {
      setData(candidateResult.items);
      setTotalPages(candidateResult.total_pages);
      setResumes(resumeResult.items);
      setLoading(false);
    });
  }, [page]);

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between border p-4 rounded-lg mt-2">
        <h1 className="font-semibold">Candidate List</h1>
        {/* <AddCandidateButton /> */}
      </div>

      {loading ? (
        <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : (
        <CandidatesTable data={data} resumes={resumes} />
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

      <CompareBar />
    </div>
  );
}