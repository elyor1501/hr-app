"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getCandidateById, invalidateCandidatesCache } from "@/lib/candidates/data";
import { getApiUrl } from "@/lib/api-config";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type Props = {
  candidateId: string;
  attachmentTypes: string[];
  onSuccess?: (updated: any) => void;
};

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
];

const ALLOWED_FILE_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".ppt", ".pptx",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".tif",
];

export function UploadAttachmentDialog({
  candidateId,
  attachmentTypes,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isImageFile = (file: File): boolean => {
    return file.type.startsWith("image/");
  };

  const validateFile = (file: File): boolean => {
    const isValidType = ALLOWED_FILE_TYPES.includes(file.type);
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_FILE_EXTENSIONS.some((ext) =>
      fileName.endsWith(ext)
    );

    if (!isValidType && !hasValidExtension) {
      toast.error("Invalid file type. Please upload PDF, DOC, DOCX, PPT, PPTX, or image files.");
      return false;
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
    setPreview(null);

    if (selectedFile) {
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        if (isImageFile(selectedFile)) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreview(reader.result as string);
          };
          reader.readAsDataURL(selectedFile);
        }
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
        const token = typeof window !== "undefined"
          ? localStorage.getItem("access_token") || ""
          : "";

        const apiUrl = getApiUrl();
        const uploadUrl = apiUrl
          ? `${apiUrl}/api/v1/candidates/${candidateId}/attachments`
          : `/api/v1/candidates/${candidateId}/attachments`;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("attachment_type", docType);

        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Upload attachment failed:", text);
          throw new Error("Failed to upload attachment");
        }

        invalidateCandidatesCache();
        const updated = await getCandidateById(candidateId);
        onSuccess?.(updated);

        toast.success("Attachment uploaded successfully");
        setFile(null);
        setPreview(null);
        setDocType("");
        setOpen(false);
      } catch (error: any) {
        toast.error(error?.message || "Upload failed");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) {
        setFile(null);
        setPreview(null);
        setDocType("");
      }
    }}>
      <DialogTrigger asChild>
        <button
          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm text-white transition-all duration-300 hover:shadow-lg w-full sm:w-auto"
          style={{ backgroundColor: "#429ABD" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5A623")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#429ABD")}
        >
          Upload Attachment
        </button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] sm:w-auto max-w-md mx-auto rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle style={{ color: "#429ABD" }}>
            Upload Attachment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Attachment Type
            </label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-[#429ABD] focus:border-[#429ABD]">
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
              accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tiff,.tif"
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#429ABD] focus:border-[#429ABD]"
            />
            <p className="text-xs text-muted-foreground">
              PDF, DOC, DOCX, PPT, PPTX, JPG, PNG, GIF, WEBP, SVG, BMP, TIFF — Max 10MB
            </p>
          </div>

          {preview && (
            <div className="border rounded-lg p-2 flex items-center justify-center bg-muted/30">
              <img
                src={preview}
                alt="Preview"
                className="max-h-40 max-w-full object-contain rounded"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="w-full sm:w-auto transition-all duration-300 hover:border-[#429ABD] hover:text-[#429ABD]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isPending}
            className="w-full sm:w-auto transition-all duration-300 hover:shadow-lg"
            style={{ backgroundColor: "#429ABD" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5A623")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#429ABD")}
          >
            {isPending ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}