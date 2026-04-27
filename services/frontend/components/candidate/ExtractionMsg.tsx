"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function ResumeExtractionToast({ resumes }: { resumes: any[] }) {
  const toastIdRef = useRef<string | number | null>(null);
  const prevProcessingRef = useRef<boolean | null>(null);
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    const processing = resumes.some(
      (r) => !r.raw_text || r.raw_text.trim() === ""
    );
    const currentCount = resumes.length;

    if (prevProcessingRef.current === null) {
      prevProcessingRef.current = processing;
      prevCountRef.current = currentCount;
      return;
    }

    const isNewResumeAdded = currentCount > (prevCountRef.current || 0);

    if ((isNewResumeAdded && processing) || (prevProcessingRef.current === false && processing === true)) {
      if (!toastIdRef.current) {
        toastIdRef.current = toast.loading(
          "Resume extraction is in progress..."
        );
      }
    }

    if (prevProcessingRef.current === true && processing === false) {
      if (toastIdRef.current) {
        toast.success("Resume extraction completed", {
          id: toastIdRef.current,
        });
        toastIdRef.current = null;
      }
    }

    prevProcessingRef.current = processing;
    prevCountRef.current = currentCount;
  }, [resumes]);

  return null;
}