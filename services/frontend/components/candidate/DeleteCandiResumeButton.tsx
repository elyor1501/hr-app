"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

import { deleteResume } from "@/lib/candidates/action";
import { getCandidateById } from "@/lib/candidates/data";
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
        await deleteResume(candidateId, resumeId);

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
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="p-2 text-gray-400 hover:text-[#F5A623] hover:bg-[#F5A62320] rounded-lg transition-all duration-300"
          title="Delete Resume"
        >
          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] sm:w-auto max-w-lg mx-auto rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle style={{ color: '#429ABD' }}>Delete Resume</DialogTitle>
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
            onClick={handleDelete}
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