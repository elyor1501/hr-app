"use client";

import { useState, useEffect } from "react";
import { getApiUrl, getAuthToken } from "@/lib/api-config";
import { CandidateCreationTracker } from "@/components/candidate/ExtractionMsg";
import { useRouter } from "next/navigation";
import ResumeUpload from "../resumes/ResumeUpload";

async function getCurrentCandidateCount(): Promise<number> {
  try {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    const url = apiUrl
      ? `${apiUrl}/api/v1/candidates/?page=1&page_size=1`
      : `/api/v1/candidates/?page=1&page_size=1`;
    const res = await fetch(url, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.total || 0;
  } catch {
    return 0;
  }
}

export default function AddResumeButton() {
  const [open, setOpen] = useState(false);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [baselineCount, setBaselineCount] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    const init = async () => {
      try {
        const token = getAuthToken();
        const apiUrl = getApiUrl();

        const res = await fetch(`${apiUrl}/api/v1/resumes/`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch resumes");
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        setExistingFiles(items.map((r: any) => r.file_name));
      } catch (err) {
        console.error("Error during init:", err);
        setExistingFiles([]);
      }
    };

    init();
  }, [open]);

  const handleFinished = () => {
    router.refresh();
    setUploadedCount(0);
    setBaselineCount(null);
    setIsTracking(false);
  };

  const handleUploaded = async (count: number) => {
    if (count <= 0) return;
    const currentBase = await getCurrentCandidateCount();
    setBaselineCount(currentBase);
    setUploadedCount(count);
    setIsTracking(true);
    router.refresh();
  };

  return (
    <>
      {isTracking && (
        <CandidateCreationTracker
          uploadedCount={uploadedCount}
          baselineCount={baselineCount}
          onNewCandidates={() => {}}
          onFinished={handleFinished}
        />
      )}

      <button
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 rounded-md transition-all duration-300 hover:shadow-lg"
        style={{ backgroundColor: "#429ABD", color: "white" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#F5A623")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "#429ABD")
        }
      >
        Add Resume
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-xl p-6 relative shadow-lg">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-gray-500 transition-colors duration-300"
              onMouseEnter={(e) => (e.currentTarget.style.color = "#F5A623")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "")}
            >
              ✕
            </button>
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: "#429ABD" }}
            >
              Upload Resume
            </h2>
            <ResumeUpload
              onClose={() => setOpen(false)}
              existingFiles={existingFiles}
              onUploaded={handleUploaded}
            />
          </div>
        </div>
      )}
    </>
  );
}
