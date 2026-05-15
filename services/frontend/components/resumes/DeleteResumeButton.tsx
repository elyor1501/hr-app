"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { deleteResume } from "@/lib/resumeList/action";
import { toast } from "sonner";

export function DeleteResumeButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteResume(id);
      toast.success("Deleted successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="transition-all duration-300 hover:bg-[#F5A62320] hover:text-[#F5A623]"
          title="Delete Resume"
        >
          <Trash className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle style={{ color: '#429ABD' }}>Delete Resume</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this resume?
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="transition-all duration-300 hover:border-[#429ABD] hover:text-[#429ABD]"
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="transition-all duration-300 hover:bg-[#F5A623] hover:border-[#F5A623] bg-red-600"
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}