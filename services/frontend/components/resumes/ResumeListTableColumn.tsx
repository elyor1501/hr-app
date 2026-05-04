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
      const fileUrl = resume.file_url;

      const extension = fileUrl.split(".").pop()?.toLowerCase();

      if (extension === "pdf") {
        window.open(fileUrl, "_blank");
      } else {
        const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        window.open(viewerUrl, "_blank");
      }
    } catch (error) {
      toast.error("Failed to view");
    } finally {
      setIsViewing(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onView}
        disabled={isViewing}
        title="View Resume"
      >
        <EyeIcon className="w-4 h-4" />
      </Button>
      <DeleteResumeButton id={resume.id} />
      <Button
        variant="ghost"
        size="icon"
        onClick={onDownload}
        disabled={isDownloading}
        title="Download Resume"
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};

export const columns_resume_list: ColumnDef<ResumeList>[] = [
  // {
  //   accessorKey: "id",
  //   header: "Id",
  //   cell: ({ row }) => <span>{row.getValue("id") || "NA"}</span>,
  // },
  {
    accessorKey: "file_name",
    header: "File Name",
    cell: ({ row }) => (
      <span className="uppercase break-words whitespace-normal">
        {row.getValue("file_name") || "NA"}
      </span>
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
          <span>Uploaded At</span>
          <ArrowUpDown className="h-3 w-3" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return (
        <div className="text-center w-full px-2 py-1">
          {date.toLocaleDateString("en-GB").replace(/\//g, ".")}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionCell resume={row.original} />,
  },
];
