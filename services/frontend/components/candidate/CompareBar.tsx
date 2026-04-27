"use client";

import { useState } from "react";
import { useCompareStore } from "@/hooks/use-compare-store";
import { Button } from "@/components/ui/button";
import { GitCompareArrows, X, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function CompareBar() {
  const { selected, removeCandidate, clearAll } = useCompareStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const canCompare = selected.length >= 2;

  if (selected.length === 0) return null;

  const handleCompare = async () => {
    if (!canCompare) return;
    setIsLoading(true);
    const ids = selected.map((c) => c.id).join(",");
    router.push(`/candidates/compare?ids=${ids}`);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">

        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 shrink-0">
          <GitCompareArrows className="w-4 h-4 text-blue-600" />
          <span>
            Selected{" "}
            <span className="text-blue-600 font-bold">{selected.length}</span>
            <span className="text-gray-400"> / 4</span>
          </span>
        </div>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 shrink-0" />

        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {selected.map((candidate) => (
            <div
              key={candidate.id}
              className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full pl-3 pr-1.5 py-1"
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {candidate.first_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200 max-w-[120px] truncate">
                {candidate.first_name} {candidate.last_name}
              </span>
              <button
                onClick={() => removeCandidate(candidate.id)}
                disabled={isLoading}
                className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
                title="Remove"
              >
                <X className="w-3 h-3 text-blue-600 dark:text-blue-300" />
              </button>
            </div>
          ))}

          {selected.length === 1 && (
            <span className="text-xs text-amber-500 font-medium italic">
              ⚠ Select at least 1 more candidate to compare
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={isLoading}
            className="text-gray-400 hover:text-red-500 gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </Button>

          <Button
            size="sm"
            onClick={handleCompare}
            disabled={!canCompare || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 min-w-[130px] disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <GitCompareArrows className="w-4 h-4" />
                Compare ({selected.length})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
