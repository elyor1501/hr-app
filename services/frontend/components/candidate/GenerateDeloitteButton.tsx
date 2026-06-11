"use client";

import { useState, useTransition } from "react";
import { FileDown, Download, Eye, Loader2, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api-config";
import { getCandidateById, invalidateCandidatesCache } from "@/lib/candidates/data";

type Props = {
  candidateId: string;
  cvId: string;
  deloittePptxUrl: string | null;
  cvFileName: string;
  onSuccess: (updated: any) => void;
};

export function GenerateDeloitteButton({
  candidateId,
  cvId,
  deloittePptxUrl,
  cvFileName,
  onSuccess,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") || ""
      : "";

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const token = getToken();
      const apiUrl = getApiUrl();
      const url = apiUrl
        ? `${apiUrl}/api/v1/candidates/${candidateId}/cvs/${cvId}/generate-deloitte`
        : `/api/v1/candidates/${candidateId}/cvs/${cvId}/generate-deloitte`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Generate Deloitte failed:", text);
        throw new Error("Failed to generate Deloitte resume");
      }

      invalidateCandidatesCache();
      const updated = await getCandidateById(candidateId);
      onSuccess(updated);
      toast.success("Deloitte resume generated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate Deloitte resume");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const token = getToken();
        const apiUrl = getApiUrl();
        const url = apiUrl
          ? `${apiUrl}/api/v1/candidates/${candidateId}/cvs/${cvId}/deloitte`
          : `/api/v1/candidates/${candidateId}/cvs/${cvId}/deloitte`;

        const res = await fetch(url, {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Delete Deloitte failed:", text);
          throw new Error("Failed to delete Deloitte resume");
        }

        invalidateCandidatesCache();
        const updated = await getCandidateById(candidateId);
        onSuccess(updated);
        toast.success("Deloitte resume deleted");
        setDeleteOpen(false);
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete Deloitte resume");
      }
    });
  };

  const handleView = () => {
    if (!deloittePptxUrl) return;

    const ext = deloittePptxUrl?.split(".").pop()?.toLowerCase();

    if (ext === "pdf") {
      window.open(deloittePptxUrl, "_blank");
      return;
    }

    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(deloittePptxUrl)}&embedded=true`;
    const newWindow = window.open(viewerUrl, "_blank");

    if (!newWindow) return;

    let attempts = 0;
    const maxAttempts = 3;

    const retry = () => {
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(() => {
          try {
            newWindow.location.href = `${viewerUrl}&t=${Date.now()}`;
          } catch {
            return;
          }
          retry();
        }, 4000);
      } else {
        setTimeout(() => {
          try {
            newWindow.location.href = deloittePptxUrl;
          } catch {}
        }, 4000);
      }
    };

    setTimeout(retry, 4000);
  };

  const handleDownload = async () => {
    if (!deloittePptxUrl) return;
    try {
      const response = await fetch(deloittePptxUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const baseName = cvFileName.replace(/\.[^/.]+$/, "");
      link.setAttribute("download", `${baseName}_Deloitte.pptx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Failed to download Deloitte resume");
    }
  };

  if (deloittePptxUrl) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleView();
          }}
          className="p-2 text-muted-foreground hover:text-[#429ABD] hover:bg-[#429ABD10] rounded-lg transition-all duration-300"
          title="View Deloitte Resume"
        >
          <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="p-2 text-muted-foreground hover:text-[#429ABD] hover:bg-[#429ABD10] rounded-lg transition-all duration-300"
          title="Download Deloitte Resume"
        >
          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-300"
              title="Delete Deloitte Resume"
            >
              <Trash className="w-4 h-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] sm:w-auto max-w-lg mx-auto rounded-xl sm:rounded-lg">
            <DialogHeader>
              <DialogTitle style={{ color: "#429ABD" }}>
                Delete Deloitte Resume
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this Deloitte resume?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteOpen(false);
                }}
                disabled={isPending}
                className="w-full sm:w-auto"
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
                className="w-full sm:w-auto bg-red-600 hover:bg-[#F5A623]"
              >
                {isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleGenerate();
      }}
      disabled={generating}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all duration-300 hover:shadow-md disabled:opacity-60"
      style={{ backgroundColor: "#429ABD" }}
      onMouseEnter={(e) => {
        if (!generating) e.currentTarget.style.backgroundColor = "#F5A623";
      }}
      onMouseLeave={(e) => {
        if (!generating) e.currentTarget.style.backgroundColor = "#429ABD";
      }}
      title="Generate Deloitte Resume"
    >
      {generating ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <FileDown className="w-3.5 h-3.5" />
      )}
      {generating ? "Generating..." : "Generate Deloitte"}
    </button>
  );
}