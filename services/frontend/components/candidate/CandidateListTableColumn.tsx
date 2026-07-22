"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { CandidateList } from "@/lib/candidates/data";
import { useRouter } from "next/navigation";
import { DeleteCandidateButton } from "./DeleteCandidateButton";

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
          <div className="text-sm text-gray-500">
            {email
              .split(",")
              .map((mail: string) => mail.trim())
              .filter(Boolean)
              .map((mail: string, index: number) => (
                <div key={index} className="break-all">
                  {mail}
                </div>
              ))}
          </div>
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
    accessorKey: "current_company",
    header: "Company",
    cell: ({ row }) => (
      <span className="whitespace-normal break-words text-sm">
        {row.original.current_company || "NA"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 90,
    minSize: 80,
    maxSize: 100,
    cell: ({ row }) => {
      const s = row.original.status as string;
      return (
        <div className="flex justify-center">
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
              s === "active"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {s === "active" ? "Active" : "Inactive"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "years_of_experience",
    header: () => <div className="text-center">Exp</div>,
    size: 70,
    minSize: 60,
    maxSize: 80,
    cell: ({ row }) => (
      <div className="text-center whitespace-nowrap">
        {row.original.years_of_experience
          ? `${row.original.years_of_experience}yrs`
          : "-"}
      </div>
    ),
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
          {/* <ArrowUpDown className="h-3 w-3" /> */}
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
    size: 20,
    minSize: 30,
    maxSize: 40,
    cell: ({ row }) => {
      const candidate = row.original;

      return (
        <div className="flex justify-center items-center">
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteCandidateButton candidateId={candidate.id} />
          </div>
        </div>
      );
    },
  },
];
