"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { CandidateList } from "@/lib/candidates/data";
import { useRouter } from "next/navigation";
import { CompareCheckbox } from "./CompareCheckbox";
import { DeleteCandidateButton } from "./DeleteCandidateButton";

export const columns_candidate_list: ColumnDef<CandidateList>[] = [
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <div className="flex justify-center w-full">
  //       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter"></span>
  //     </div>
  //   ),
  //   cell: ({ row }) => (
  //     <div className="flex justify-center w-full">
  //       <CompareCheckbox candidate={row.original} />
  //     </div>
  //   ),
  //   size: 40,
  // },
  {
    accessorKey: "first_name",
    header: "Name",
    cell: ({ row }) => {
      const first = row.original.first_name || "";
      const last = row.original.last_name || "";

      const fullName = `${first} ${last}`.trim();

      return <span className="font-medium">{fullName || "NA"}</span>;
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span className="break-words">{row.getValue("email") || "NA"}</span>,
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
    cell: ({ row }) => (
      <div className="text-center w-full">
        {row.getValue("years_of_experience") || "NA"} yrs
      </div>
    ),
    size: 80,
  },
  {
    accessorKey: "created_at",
    header: () => <div className="text-center w-full">Created At</div>,
    cell: ({ row }) => {
      row.getValue("created_at");
    },
  },
  {
    header: "Actions",
    cell: ({ row }) => {
      const router = useRouter();
      const candidate = row.original;
      return (
        <div className="flex items-center justify-center w-full gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/candidates/${candidate.id}`)}
            className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50"
             title="View Candidate" 
          >
            <Eye className="w-4 h-4" />
          </Button>
          <DeleteCandidateButton candidateId={candidate.id} />
        </div>
      );
    },
  },
];
