"use client";

import { useCompareStore } from "@/hooks/use-compare-store";
import { Checkbox } from "@/components/ui/checkbox";
import { CandidateList } from "@/lib/candidates/data";

export function CompareCheckbox({ candidate }: { candidate: CandidateList }) {
  const { isSelected, addCandidate, removeCandidate, selected } = useCompareStore();
  const active = isSelected(candidate.id);
  const maxReached = selected.length >= 4 && !active;

  return (
    <Checkbox
      checked={active}
      disabled={maxReached && !active}
      onCheckedChange={(checked) => {
        if (checked) {
          addCandidate(candidate);
        } else {
          removeCandidate(candidate.id);
        }
      }}
      aria-label={`Select ${candidate.first_name} for comparison`}
      title={maxReached ? "Max 4 candidates allowed" : ""}
      className="transition-all duration-200"
    />
  );
}
