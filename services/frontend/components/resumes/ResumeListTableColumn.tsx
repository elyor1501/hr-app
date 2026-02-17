"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Download } from "lucide-react";
import { DeleteResumeButton } from "./DeleteResumeButton";

export type ResumeList = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
};

export const columns_resume_list: ColumnDef<ResumeList>[] = [
  {
    accessorKey: "file_name",
    header: "File Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("file_name") || "NA"}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Uploaded At
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span>
        {new Date(row.getValue("created_at"))
          .toLocaleDateString("en-GB")
          .replace(/\//g, ".")}
        &nbsp;
        {new Date(row.getValue("created_at")).toLocaleTimeString("en-GB", {
          hour12: false,
        })}
      </span>
    ),
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const resume = row.original;

      const handleDownload = () => {
        if (!resume.id) {
          console.error("No resume ID available");
          return;
        }

        const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resumes/${resume.id}/download`;

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = resume.file_name || "resume.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      return (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
          <DeleteResumeButton id={resume.id} />
        </div>
      );
    },
  },
];
