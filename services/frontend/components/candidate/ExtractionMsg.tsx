"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getApiUrl, getAuthToken } from "@/lib/api-config";

export function ResumeExtractionToast({ resumes }: { resumes: any[] }) {
  return null;
}

export function GlobalCandidateTracker() {
  return null;
}

export function CandidateCreationTracker({
  uploadedCount,
  baselineCount,
  onNewCandidates,
  onFinished,
}: {
  uploadedCount: number;
  baselineCount: number | null;
  onNewCandidates?: (candidates: any[]) => void;
  onFinished?: () => void;
}) {
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const loadingToastIdRef = useRef<string | number | null>(null);
  const lastSeenCountRef = useRef<number>(0);
  const attemptsRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (uploadedCount === 0 || baselineCount === null) return;
    if (startedRef.current) return;

    startedRef.current = true;
    attemptsRef.current = 0;
    lastSeenCountRef.current = 0;

    toast.success(
      `${uploadedCount} resume${uploadedCount > 1 ? "s" : ""} uploaded successfully`,
      { duration: 3000 }
    );

    const t1 = setTimeout(() => {
      if (loadingToastIdRef.current) return;
      loadingToastIdRef.current = toast.loading(
        `Processing ${uploadedCount} resume${uploadedCount > 1 ? "s" : ""}...`,
        { duration: Infinity }
      );
    }, 1200);

    const t2 = setTimeout(() => {
      pollingRef.current = setInterval(async () => {
        attemptsRef.current += 1;

        try {
          const apiUrl = getApiUrl();
          const token = getAuthToken();
          const url = apiUrl
            ? `${apiUrl}/api/v1/candidates/?page=1&page_size=5`
            : `/api/v1/candidates/?page=1&page_size=5`;

          const res = await fetch(url, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            cache: "no-store",
          });

          if (!res.ok) return;

          const data = await res.json();
          const currentTotal = data.total || 0;
          const newCount = currentTotal - baselineCount;

          if (newCount > lastSeenCountRef.current) {
            const candidates = data.items || [];
            const justCreated = candidates.slice(0, newCount - lastSeenCountRef.current);

            justCreated.forEach((c: any) => {
              const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Candidate";
              if (loadingToastIdRef.current) {
                toast.success(`${name} — profile created successfully`, {
                  id: loadingToastIdRef.current,
                  duration: 5000,
                });
                loadingToastIdRef.current = null;
              } else {
                toast.success(`${name} — profile created successfully`, {
                  duration: 5000,
                });
              }
            });

            lastSeenCountRef.current = newCount;
            if (onNewCandidates) onNewCandidates(justCreated);

            if (newCount >= uploadedCount) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              pollingRef.current = null;
              if (loadingToastIdRef.current) {
                toast.dismiss(loadingToastIdRef.current);
                loadingToastIdRef.current = null;
              }
              startedRef.current = false;
              if (onFinished) onFinished();
            }
          }
        } catch (e) {
          console.error("Poll error:", e);
        }

        if (attemptsRef.current >= 120) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          if (loadingToastIdRef.current) {
            toast.dismiss(loadingToastIdRef.current);
            loadingToastIdRef.current = null;
          }
          startedRef.current = false;
          if (onFinished) onFinished();
        }
      }, 2000);
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [uploadedCount, baselineCount]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (loadingToastIdRef.current) {
        toast.dismiss(loadingToastIdRef.current);
        loadingToastIdRef.current = null;
      }
    };
  }, []);

  return null;
}