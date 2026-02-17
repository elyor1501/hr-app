"use client";

import { uploadBulkResumes } from "@/lib/resumeList/action";
import { EyeIcon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

type UploadFile = {
  file: File;
  progress: number;
  previewUrl: string;
};

const MAX_SIZE = 10 * 1024 * 1024;
const ITEMS_PER_PAGE = 3;

export default function ResumeUpload({
  onClose,
  existingFiles = [],
}: {
  onClose: () => void;
  existingFiles?: string[];
}) {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();

  const totalPages = Math.ceil(uploads.length / ITEMS_PER_PAGE);

  const paginatedUploads = uploads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const validateFile = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return "Only PDF and DOCX files allowed.";
    }

    if (file.size > MAX_SIZE) {
      return "File must be under 10MB.";
    }

    return null;
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      const validFiles: UploadFile[] = [];
      let duplicateFound = false;

      acceptedFiles.forEach((file) => {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }

        if (uploads.length + validFiles.length >= 20) {
          setError("Maximum 20 files allowed at once.");
          return;
        }

        const isDuplicateInUploads = uploads.some((f) => f.file.name === file.name);
        const isDuplicateOnBackend = existingFiles.includes(file.name);

        if (isDuplicateInUploads || isDuplicateOnBackend) {
          duplicateFound = true;
          return;
        }

        const previewUrl = URL.createObjectURL(file);

        validFiles.push({
          file,
          progress: 100,
          previewUrl,
        });
      });

      if (duplicateFound) setError("File already exist.");

      if (validFiles.length > 0) {
        setUploads((prev) => [...prev, ...validFiles]);
      }
    },
    [uploads, existingFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "application/pdf": [],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [],
    },
  });

  const removeFile = (index: number) => {
    setUploads((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  const openPreview = (file: UploadFile) => {
    if (file.file.type === "application/pdf") {
      window.open(file.previewUrl, "_blank");
    } else {
      const link = document.createElement("a");
      link.href = file.previewUrl;
      link.download = file.file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    return () => {
      uploads.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  const handleBulkSubmit = async () => {
    if (uploads.length === 0) return;

    try {
      setIsUploading(true);

      const files = uploads.map((u) => u.file);

      await uploadBulkResumes(files);

      onClose();
      router.refresh();
      setUploads([]);
    } catch (error: any) {
      console.error("Upload failed:", error);
      setError(error?.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-lg space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition
        ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm font-medium">Drag & drop files</p>
        <p className="text-xs text-gray-500">
          PDF/DOCX — Max 10MB — Max 20 files
        </p>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {paginatedUploads.map((upload, i) => {
        const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + i;

        return (
          <div key={actualIndex} className="border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium truncate w-44">
                {upload.file.name}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => openPreview(upload)}
                  disabled={isUploading}
                  className="p-1 hover:bg-blue-100 rounded"
                >
                  <EyeIcon className="w-4 h-4 text-blue-600" />
                </button>

                <button
                  onClick={() => removeFile(actualIndex)}
                  disabled={isUploading}
                  className="p-1 hover:bg-red-100 rounded"
                >
                  <TrashIcon className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="w-full bg-gray-200 h-1.5 rounded">
              <div
                className="h-1.5 bg-blue-500 rounded transition-all"
                style={{ width: `${upload.progress}%` }}
              />
            </div>

            <p className="text-[10px]">{upload.progress}% uploaded</p>
          </div>
        );
      })}

      {uploads.length > ITEMS_PER_PAGE && (
        <div className="flex justify-between text-sm">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>

          <span>
            Page {currentPage} / {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleBulkSubmit}
            disabled={isUploading}
            className="bg-blue-600 text-white px-2 py-1 rounded disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : `Upload`}
          </button>
        </div>
      )}
    </div>
  );
}
