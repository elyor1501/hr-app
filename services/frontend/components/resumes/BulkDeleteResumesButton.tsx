"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { bulkDeleteResumes } from "@/lib/resumeList/action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BulkDeleteResumesButtonProps {
  selectedIds: string[];
  onSuccessAction: () => void;
}

export function BulkDeleteResumesButton({ selectedIds, onSuccessAction }: BulkDeleteResumesButtonProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setIsDeleting(true);
    try {
      const result = await bulkDeleteResumes(selectedIds);
      if (result.deleted > 0) {
        toast.success(result.message || `Deleted ${result.deleted} resumes successfully`);
        onSuccessAction();
        setIsConfirmOpen(false);
      } else if (result.failed > 0) {
        toast.error(`Failed to delete resumes. ${result.failed} items could not be deleted.`);
      } else {
        toast.error("No resumes were deleted.");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="flex items-center gap-2 transition-all duration-300 hover:bg-[#F5A623] hover:border-[#F5A623]"
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
          Delete {selectedIds.length}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle style={{ color: '#429ABD' }}>Delete Resumes</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {selectedIds.length} selected resumes?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setIsConfirmOpen(false)}
            disabled={isDeleting}
            className="hover:border-[#429ABD] hover:text-[#429ABD] transition-all duration-300"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="transition-all duration-300 hover:bg-[#F5A623] hover:border-[#F5A623]"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}