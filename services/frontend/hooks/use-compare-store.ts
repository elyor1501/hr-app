import { create } from "zustand";
import { CandidateList } from "@/lib/candidates/data";

const MAX_COMPARE = 4;

interface CompareStore {
  selected: CandidateList[];
  addCandidate: (candidate: CandidateList) => void;
  removeCandidate: (id: string) => void;
  clearAll: () => void;
  isSelected: (id: string) => boolean;
}

export const useCompareStore = create<CompareStore>((set, get) => ({
  selected: [],

  addCandidate: (candidate) => {
    const { selected } = get();
    if (selected.length >= MAX_COMPARE) return;
    if (selected.some((c) => c.id === candidate.id)) return;
    set({ selected: [...selected, candidate] });
  },

  removeCandidate: (id) => {
    set((state) => ({ selected: state.selected.filter((c) => c.id !== id) }));
  },

  clearAll: () => set({ selected: [] }),

  isSelected: (id) => get().selected.some((c) => c.id === id),
}));
