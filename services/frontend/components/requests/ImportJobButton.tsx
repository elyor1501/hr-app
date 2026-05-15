"use client";

import { useState, useEffect } from "react";
import { getApiUrl, getAuthToken } from "@/lib/api-config";
import { Upload } from "lucide-react";
import { FileUpload } from "./RequestUpload";

export function ImportJobButton() {
  const [open, setOpen] = useState(false);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    const fetchExistingFiles = async () => {
      try {
        const token = getAuthToken();
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/v1/requirement-docs/`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });
        if (!res.ok) throw new Error("Failed to fetch documents");
        const data = await res.json();
        const fileNames = data.map((d: any) => d.file_name);
        setExistingFiles(fileNames);
      } catch (err) {
        console.error("Error fetching documents:", err);
        setExistingFiles([]);
      }
    };

    fetchExistingFiles();
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all duration-300 hover:shadow-lg font-medium"
        style={{ backgroundColor: '#429ABD', color: 'white' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5A623'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#429ABD'}
      >
        <Upload className="w-4 h-4" />
        Import
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-xl p-6 relative shadow-lg my-8">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-[#F5A623] dark:hover:text-[#F5A623] transition-colors duration-300"
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold mb-4" style={{ color: '#429ABD' }}>Import Job Description</h2>

            <FileUpload
              onClose={() => setOpen(false)}
              existingFiles={existingFiles}
            />
          </div>
        </div>
      )}
    </>
  );
}