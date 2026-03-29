"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CandidateList } from "@/lib/candidates/data";

type Props = {
  candidates: CandidateList[];
};

export default function CandidateProcessingTracker({ candidates }: Props) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    const hasProcessing = candidates.some(c => c.status === "processing");
    
    if (hasProcessing) {
      setIsProcessing(true);
      if (!toastIdRef.current) {
        toastIdRef.current = toast.loading("AI is extracting data from resumes...", {
          description: "This background process may take a while.",
          duration: Infinity,
        });
      }
    } else {
      setIsProcessing(false);
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
        toast.success("Resume data extraction complete!");
      }
    }
  }, [candidates]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isProcessing) {
      intervalId = setInterval(() => {
        router.refresh();
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isProcessing, router]);

  useEffect(() => {
    return () => {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    };
  }, []);

  return null;
}
