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
import { deleteCandidate } from "@/lib/candidates/action";
import { toast } from "sonner";

export function DeleteCandidateButton({ candidateId }: { candidateId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteCandidate(candidateId);
        toast.success("Candidate deleted successfully");
        setOpen(false);
      } catch (error) {
        toast.error("Failed to delete candidate");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="transition-all duration-300 hover:bg-[#F5A62320] hover:text-[#F5A623]" 
          title="Delete Candidate"
        >
          <Trash className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle style={{ color: '#429ABD' }}>Delete Candidate</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this Candidate?
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="transition-all duration-300 hover:border-[#429ABD] hover:text-[#429ABD]"
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
            className="transition-all duration-300 hover:bg-[#F5A623] hover:border-[#F5A623] bg-red-600"
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}