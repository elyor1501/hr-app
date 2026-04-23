"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadAttachment } from "@/lib/candidates/action";
import { getCandidateById } from "@/lib/candidates/data";
import { toast } from "sonner";

type Props = {
  candidateId: string;
  attachmentTypes: string[];
  onSuccess?: (updated: any) => void;
};

export function UploadAttachmentDialog({
  candidateId,
  attachmentTypes,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUpload = () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (!docType) {
      toast.error("Please select attachment type");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("attachment_type", docType);

        await uploadAttachment(candidateId, formData);

        const updated = await getCandidateById(candidateId);
        onSuccess?.(updated);

        toast.success("Attachment uploaded successfully");

        setFile(null);
        setDocType("");
        setOpen(false);
      } catch (error: any) {
        toast.error(error?.message || "Upload failed");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          Upload Attachment
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Attachment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Attachment Type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select attachment type</option>
              {attachmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Upload Attachment
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>

          <Button onClick={handleUpload} disabled={isPending}>
            {isPending ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
