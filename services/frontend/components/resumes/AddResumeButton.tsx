"use client";

import { useState, useEffect } from "react";
import ResumeUpload from "./ResumeUpload";
import { getApiUrl, getAuthToken } from "@/lib/api-config";

export default function AddResumeButton() {
  const [open, setOpen] = useState(false);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    const fetchExistingFiles = async () => {
      try {
        const token = getAuthToken();
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/v1/resumes/`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        });
        if (!res.ok) throw new Error("Failed to fetch resumes");
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.items ?? []);
        const fileNames = items.map((r: any) => r.file_name);

        setExistingFiles(fileNames);
      } catch (err) {
        console.error("Error fetching existing resumes:", err);
        setExistingFiles([]);
      }
    };

    fetchExistingFiles();
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 rounded-md transition-all duration-300 hover:shadow-lg"
        style={{ 
          backgroundColor: '#429ABD',
          color: 'white'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5A623'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#429ABD'}
      >
        Add Resume
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-xl p-6 relative shadow-lg">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black transition-colors duration-300"
              style={{ hover: { color: '#F5A623' } }}
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold mb-4" style={{ color: '#429ABD' }}>Upload Resume</h2>

            <ResumeUpload
              onClose={() => setOpen(false)}
              existingFiles={existingFiles}
            />
          </div>
        </div>
      )}
    </>
  );
}