"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getCandidateById,
  invalidateCandidatesCache,
} from "@/lib/candidates/data";
import { getApiUrl } from "@/lib/api-config";
import { toast } from "sonner";

type Props = {
  candidateId: string;
  resumeId: string;
  onSuccess?: (updated: any) => void;
};

export function DeleteResumeButton({
  candidateId,
  resumeId,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("access_token") || ""
            : "";

        const apiUrl = getApiUrl();
        const deleteUrl = apiUrl
          ? `${apiUrl}/api/v1/candidates/${candidateId}/cvs/${resumeId}`
          : `/api/v1/candidates/${candidateId}/cvs/${resumeId}`;

        const res = await fetch(deleteUrl, {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Delete resume failed:", text);
          throw new Error("Failed to delete resume");
        }

        invalidateCandidatesCache();
        const updated = await getCandidateById(candidateId);
        onSuccess?.(updated);

        toast.success("Resume deleted successfully");
        setOpen(false);
      } catch (error) {
        toast.error("Failed to delete resume");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="transition-all duration-300 text-red-500 hover:bg-red-50 hover:text-red-600"
          title="Delete Resume"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Trash className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] sm:w-auto max-w-lg mx-auto rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle style={{ color: "#429ABD" }}>Delete Resume</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this resume?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            disabled={isPending}
            className="w-full sm:w-auto transition-all duration-300 hover:border-[#429ABD] hover:text-[#429ABD]"
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isPending}
            className="w-full sm:w-auto transition-all duration-300 hover:bg-[#F5A623] hover:border-[#F5A623] bg-red-600"
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
