"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { DeleteRequestButton } from "./DeleteRequestButton";

export type Request = {
  id: string;
  request_number: string;
  company_name: string;
  request_title: string;
  state: string;
  prepared_rate: number | null;
  final_rate: number | null;
  request_date: string;
  proposed_date?: string;
  contract_status: boolean;
  created_at: string;
  candidate_count: number;
};

const STATE_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  signed: "Signed",
  closed: "Closed",
};

const STATE_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-[#F5A623]/20 text-[#F5A623]",
  signed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export const columns_request_list: ColumnDef<Request>[] = [
  {
    accessorKey: "request_number",
    header: "Request No",
    cell: ({ row }) => (
      <span className="uppercase break-words whitespace-normal hover:text-blue-600 hover:underline transition-colors cursor-pointer">
        {row.getValue("request_number") || "NA"}
      </span>
    ),
  },
  {
    accessorKey: "company_name",
    header: "Company",
    cell: ({ row }) => (
      <span className="break-words whitespace-normal">
        {row.getValue("company_name") || "NA"}
      </span>
    ),
  },
  {
    accessorKey: "request_title",
    header: "Title",
    cell: ({ row }) => (
      <span className="whitespace-normal break-words">
        {row.getValue("request_title") || "NA"}
      </span>
    ),
  },
  {
    accessorKey: "state",
    header: "Status",
    cell: ({ row }) => {
      const status = (row.getValue("state") as string)?.toLowerCase();
      return (
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            STATE_COLORS[status] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {STATE_LABELS[status] || status || "NA"}
        </span>
      );
    },
  },
  {
    accessorKey: "proposed_date",
    header: "Proposed Date",
    cell: ({ row }) => {
      const d = row.original.proposed_date;
      if (!d) return <span className="text-muted-foreground">-</span>;
      try {
        return (
          <span className="text-sm">
            {new Date(d).toLocaleDateString("en-GB").replace(/\//g, ".")}
          </span>
        );
      } catch {
        return <span className="text-sm">{d}</span>;
      }
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      const raw = row.original.created_at;
      if (!raw) return <div className="text-center w-full px-2 py-1">NA</div>;
      const parts = raw.split("T")[0].split("-");
      const formatted =
        parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : raw;
      return <div className="text-center w-full px-2 py-1">{formatted}</div>;
    },
  },
  {
    header: "Actions",
    cell: ({ row }) => {
      const router = useRouter();
      const request = row.original;
      return (
        <div className="flex items-center justify-center gap-2">
          <div onClick={(e) => e.stopPropagation()}>
            <DeleteRequestButton requestId={request.id} />
          </div>
        </div>
      );
    },
  },
];