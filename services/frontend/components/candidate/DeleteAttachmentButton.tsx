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

import { deleteAttachment } from "@/lib/candidates/action";
import { getCandidateById } from "@/lib/candidates/data";
import { toast } from "sonner";

type Props = {
  candidateId: string;
  attachmentId: string;
  onSuccess?: (updated: any) => void;
};

export function DeleteAttachmentButton({
  candidateId,
  attachmentId,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteAttachment(candidateId, attachmentId);

        const updated = await getCandidateById(candidateId);
        onSuccess?.(updated);

        toast.success("Attachment deleted successfully");
        setOpen(false);
      } catch (error) {
        toast.error("Failed to delete attachment");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete Attachment"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Attachment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this attachment?
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}