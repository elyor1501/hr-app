"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye } from "lucide-react";
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

export const columns_request_list: ColumnDef<Request>[] = [
  {
    accessorKey: "request_number",
    header: "Request No",
    cell: ({ row }) => (
      <span className="font-medium">
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
    header: "Request Status",
    cell: ({ row }) => <span>{row.getValue("state") || "NA"}</span>,
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
    accessorFn: (row) => {
      const date = new Date(row.created_at);
      return date.toLocaleDateString("en-GB").replace(/\//g, ".");
    },
    cell: ({ getValue }) => (
      <div className="text-center w-full px-2 py-1">
        {getValue() as string}
      </div>
    ),
  },
  {
    header: "Actions",
    cell: ({ row }) => {
      const router = useRouter();
      const request = row.original;

      return (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/requests/${request.id}`)}
            className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <DeleteRequestButton requestId={request.id} />
        </div>
      );
    },
  },
];
