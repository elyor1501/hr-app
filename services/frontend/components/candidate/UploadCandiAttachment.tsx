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
import {   Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue, } from "../ui/select";

type Props = {
  candidateId: string;
  attachmentTypes: string[];
  onSuccess?: (updated: any) => void;
};

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/svg+xml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const ALLOWED_FILE_EXTENSIONS = [".pdf", ".jpeg", ".jpg", ".png", ".svg", ".doc", ".docx", ".ppt", ".pptx"];

export function UploadAttachmentDialog({
  candidateId,
  attachmentTypes,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      const fileName = file.name.toLowerCase();
      const hasValidExtension = ALLOWED_FILE_EXTENSIONS.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        toast.error("Invalid file type. Please upload PDF, images (JPG, PNG, SVG), DOC, DOCX, PPT, or PPTX files only.");
        return false;
      }
    }
    
    const maxSize = 10 * 1024 * 1024; 
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return false;
    }
    
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      } else {
        e.target.value = ""; 
        setFile(null);
      }
    } else {
      setFile(null);
    }
  };

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
        <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg text-sm w-full sm:w-auto">
          Upload Attachment
        </button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] sm:w-auto max-w-md mx-auto rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Upload Attachment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
         <div className="space-y-1">
  <label className="text-sm font-medium text-gray-700">
    Attachment Type
  </label>
  <Select value={docType} onValueChange={setDocType}>
    <SelectTrigger className="w-full border rounded-lg px-3 py-2 text-sm">
      <SelectValue placeholder="Select attachment type" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Attachment Types</SelectLabel>
        {attachmentTypes.map((type) => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
</div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Upload Attachment
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpeg,.jpg,.png,.svg,.doc,.docx,.ppt,.pptx,application/pdf,image/jpeg,image/jpg,image/png,image/svg+xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="w-full text-sm border rounded-lg px-3 py-2"
            />
          
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <Button onClick={handleUpload} disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}