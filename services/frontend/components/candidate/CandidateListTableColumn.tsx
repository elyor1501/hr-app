"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye } from "lucide-react";
import { CandidateList } from "@/lib/candidates/data";
import { useRouter } from "next/navigation";
import { CompareCheckbox } from "./CompareCheckbox";
import { DeleteCandidateButton } from "./DeleteCandidateButton";
import { ViewCandidateButton } from "./ViewCandidateButton";

export const columns_candidate_list: ColumnDef<CandidateList>[] = [
  {
    accessorKey: "first_name",
    header: "Name and Email",
    cell: ({ row }) => {
      const first = row.original.first_name || "";
      const last = row.original.last_name || "";
      const email = row.original.email || "NA";
      const fullName = `${first} ${last}`.trim();

      return (
        <div className="flex flex-col">
          <span className="font-medium hover:text-blue-600 hover:underline transition-colors">
            {fullName || "NA"}
          </span>
          <span className="text-sm text-gray-500 break-all">{email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "current_title",
    header: "Role",
    cell: ({ row }) => (
      <span className="whitespace-normal break-words">
        {row.getValue("current_title") || "NA"}
      </span>
    ),
  },
  {
    accessorKey: "years_of_experience",
    header: () => <div className="text-center w-full">Year of experience</div>,
    cell: ({ row }) => {
      const years = row.original.years_of_experience;
      return (
        <div className="text-center w-full">
          {years ? `${years} years` : "NA"}
        </div>
      );
    },
    size: 80,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <div className="flex items-center justify-center w-full">
        <Button
          variant="ghost"
          className="flex items-center gap-1 px-2 py-1"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span>Created At</span>
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      const formatted = date.toLocaleDateString("en-GB").replace(/\//g, ".");
      return <div className="text-center w-full px-2 py-1">{formatted}</div>;
    },
  },
  {
    header: "Actions",
    cell: ({ row }) => {
      const router = useRouter();
      const candidate = row.original;
      return (
        <div className="flex items-center justify-center w-full gap-2">
          {/* <div onClick={(e) => e.stopPropagation()}>
            <ViewCandidateButton candidateId={candidate.id} />
          </div> */}
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteCandidateButton candidateId={candidate.id} />
          </div>
        </div>
      );
    },
  },
];
