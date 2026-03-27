"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Download, EyeIcon } from "lucide-react";
import { DeleteResumeButton } from "./DeleteResumeButton";
import { downloadResume, viewResume } from "@/lib/resumeList/action";
import { toast } from "sonner";

export type ResumeList = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  updated_at: string;
};

export const columns_resume_list: ColumnDef<ResumeList>[] = [
  {
    accessorKey: "id",
    header: "Id",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("id") || "NA"}</span>
    ),
  },
  {
    accessorKey: "file_name",
    header: "File Name",
    cell: ({ row }) => (
      <span className="whitespace-normal break-words">{row.getValue("file_name") || "NA"}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created At
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
    accessorKey: "updated_at",
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
        {new Date(row.getValue("updated_at"))
          .toLocaleDateString("en-GB")
          .replace(/\//g, ".")}
        &nbsp;
        {new Date(row.getValue("updated_at")).toLocaleTimeString("en-GB", {
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

      const onDownload = async () => {
        try {
          await downloadResume(resume.id, resume.file_name, resume.file_url);
          toast.success("Downloaded successfully");
        } catch (error) {
          toast.error("Failed to download");
        }
      };

      const onView = async () => {
        try {
          await viewResume(resume.id, resume.file_name, resume.file_url);
        } catch (error) {
          toast.error("Failed to view");
        }
      };

      return (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={onView}>
            <EyeIcon className="w-4 h-4" />
          </Button>       
          <DeleteResumeButton id={resume.id} />
          <Button variant="ghost" size="icon" onClick={onDownload}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      );
    },
  },
];
