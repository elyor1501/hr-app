"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, Pen, Trash, ZoomIn } from "lucide-react";
import { CandidateList } from "@/lib/candidates/data";
import { useRouter } from "next/navigation";
import { DeleteCandidateButton } from "./DeleteCandidateButton";

export const columns_candidate_list: ColumnDef<CandidateList>[] = [
  {
    accessorKey: "first_name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("first_name") || "NA"}</span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span>{row.getValue("email") || "NA"}</span>,
  },
  {
    accessorKey: "current_title",
    header: "Role",
    cell: ({ row }) => <span>{row.getValue("current_title") || "NA"}</span>,
  },
  {
    accessorKey: "years_of_experience",
    header: () => <div className="text-center w-full">Year of experience</div>,
    cell: ({ row }) => (
      <div className="text-center w-full">
        {row.getValue("years_of_experience") || "NA"}
      </div>
    ),
    size: 120,
  },
  {
    header: "Actions",
    cell: ({ row }) => {
      const router = useRouter();
      const candidate = row.original;
      return (
        <div className="flex items-center justify-center w-full gap-2">
          <DeleteCandidateButton candidateId={candidate.id} />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/candidates/${candidate.id}`)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      );
    },
  },
];
