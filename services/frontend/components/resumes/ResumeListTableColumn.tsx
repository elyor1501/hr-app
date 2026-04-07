"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Download, EyeIcon, Loader2 } from "lucide-react";
import { DeleteResumeButton } from "./DeleteResumeButton";
import { downloadResume, viewResume } from "@/lib/resumeList/action";
import { toast } from "sonner";
import { useState } from "react";

export type ResumeList = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  updated_at: string;
};

const ActionCell = ({ resume }: { resume: ResumeList }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isViewing, setIsViewing] = useState(false);

  const onDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadResume(resume.id, resume.file_name, resume.file_url);
      toast.success("Downloaded successfully");
    } catch (error) {
      toast.error("Failed to download");
    } finally {
      setIsDownloading(false);
    }
  };

  const onView = async () => {
    setIsViewing(true);
    try {
      await viewResume(resume.id, resume.file_name, resume.file_url);
    } catch (error) {
      toast.error("Failed to view");
    } finally {
      setIsViewing(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="ghost" size="icon" onClick={onView} disabled={isViewing}>
        {isViewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeIcon className="w-4 h-4" />}
      </Button>       
      <DeleteResumeButton id={resume.id} />
      <Button variant="ghost" size="icon" onClick={onDownload} disabled={isDownloading}>
        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </Button>
    </div>
  );
};

export const columns_resume_list: ColumnDef<ResumeList>[] = [
  {
    accessorKey: "id",
    header: "Id",
    cell: ({ row }) => (
      <span className="font-medium text-xs text-muted-foreground uppercase">{row.getValue("id") || "NA"}</span>
    ),
  },
  {
    accessorKey: "file_name",
    header: "File Name",
    cell: ({ row }) => (
      <span className="whitespace-normal font-medium text-xs text-muted-foreground uppercase">{row.getValue("file_name") || "NA"}</span>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className=""
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created At
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-xs font-medium tabular-nums">
        {new Date(row.getValue("created_at"))
          .toLocaleDateString("en-GB")
          .replace(/\//g, ".")}
        &nbsp;
        <span className="text-muted-foreground">
          {new Date(row.getValue("created_at")).toLocaleTimeString("en-GB", {
            hour12: false,
          })}
        </span>
      </span>
    ),
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className=""
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Uploaded At
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-xs font-medium tabular-nums">
        {new Date(row.getValue("updated_at"))
          .toLocaleDateString("en-GB")
          .replace(/\//g, ".")}
        &nbsp;
        <span className="text-muted-foreground">
          {new Date(row.getValue("updated_at")).toLocaleTimeString("en-GB", {
            hour12: false,
          })}
        </span>
      </span>
    ),
  },

  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionCell resume={row.original} />,
  },
];
