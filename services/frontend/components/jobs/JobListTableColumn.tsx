"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { JobList } from "@/lib/jobs/data";
import { DeleteJobButton } from "../jobs/DeleteJobButton";
import { useRouter } from "next/navigation";

export const columns_job_list: ColumnDef<JobList>[] = [
  {
    accessorKey: "title",
    header: "Job Title",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("title") || "NA"}</span>
    ),
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => <span>{row.getValue("department") || "NA"}</span>,
  },
  {
    accessorKey: "employment_type",
    header: "Job Type",
    cell: ({ row }) => <span>{row.getValue("employment_type") || "NA"}</span>,
  },
  {
    accessorKey: "experience_required",
    header: () => <div className="text-center w-full">Required Experience</div>,
    cell: ({ row }) => (
      <div className="text-center w-full">
        {row.getValue("experience_required") || "NA"}
      </div>
    ),
    size: 120,
  },
  {
    accessorKey: "openings",
    header: () => <div className="text-center w-full">Openings</div>,
    cell: ({ row }) => (
      <div className="text-center w-full">
        {row.getValue("openings") || "NA"}
      </div>
    ),
    size: 120,
  },

 {
  header: "Actions",
  cell: ({ row }) => {
    const router = useRouter();
    const job = row.original;

    return (
      <div className="flex items-center justify-center gap-2">
        <DeleteJobButton jobId={job.id} />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/jobs/${job.id}`)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    );
  },
}

];
