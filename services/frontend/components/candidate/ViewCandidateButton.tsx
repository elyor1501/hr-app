"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  candidateId: string;
}

export function ViewCandidateButton({ candidateId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    router.push(`/candidates/${candidateId}`);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={loading}
      className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50"
      title="View Candidate"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Eye className="w-4 h-4" />
      )}
    </Button>
  );
}