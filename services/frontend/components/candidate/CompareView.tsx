"use client";

import { useRef, useState } from "react";
import { usePDF } from "react-to-pdf";
import { CandidateList } from "@/lib/candidates/data";
import { Button } from "@/components/ui/button";
import {
  Download,
  Link2,
  ArrowLeft,
  X,
  Check,
  GitCompareArrows,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCompareStore } from "@/hooks/use-compare-store";
import { useEffect } from "react";

function getSkillSet(candidate: CandidateList): string[] {
  const raw = candidate.skills;
  if (!raw || raw.length === 0) return [];
  if (raw.length === 1 && raw[0].includes(",")) {
    return raw[0].split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  return raw.map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function initials(c: CandidateList) {
  return `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase();
}

function fullName(c: CandidateList) {
  return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
}

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-orange-500",
];

// ─── Skills Venn Diagram (2 candidates) ──────────────────────────────────────

function SkillsVenn({ candidates }: { candidates: CandidateList[] }) {
  const a = new Set(getSkillSet(candidates[0]));
  const b = new Set(getSkillSet(candidates[1]));

  const onlyA = [...a].filter((s) => !b.has(s));
  const shared = [...a].filter((s) => b.has(s));
  const onlyB = [...b].filter((s) => !a.has(s));

  const chipBase = "inline-block rounded-full px-2.5 py-1 text-xs font-medium m-0.5";

  return (
    <div>
      <div className="flex justify-center mb-4">
        <svg viewBox="0 0 360 120" className="w-64 h-auto opacity-30">
          <circle cx="120" cy="60" r="70" fill="#3b82f6" />
          <circle cx="240" cy="60" r="70" fill="#10b981" />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Only A */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-3 truncate">
            {candidates[0].first_name} only
          </p>
          <div>
            {onlyA.length === 0 ? (
              <p className="text-xs text-gray-400 italic">None unique</p>
            ) : (
              onlyA.map((s) => (
                <span
                  key={s}
                  className={`${chipBase} bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200`}
                >
                  {s}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Shared */}
        <div className="bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-4">
          <p className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-3 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Shared ({shared.length})
          </p>
          <div>
            {shared.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No overlap</p>
            ) : (
              shared.map((s) => (
                <span
                  key={s}
                  className={`${chipBase} bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200`}
                >
                  {s}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Only B */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-3 truncate">
            {candidates[1].first_name} only
          </p>
          <div>
            {onlyB.length === 0 ? (
              <p className="text-xs text-gray-400 italic">None unique</p>
            ) : (
              onlyB.map((s) => (
                <span
                  key={s}
                  className={`${chipBase} bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200`}
                >
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skills Matrix (3–4 candidates) ──────────────────────────────────────────

function SkillsMatrix({ candidates }: { candidates: CandidateList[] }) {
  const skillSets = candidates.map((c) => new Set(getSkillSet(c)));
  const allSkills = Array.from(new Set(skillSets.flatMap((s) => [...s]))).sort();

  if (allSkills.length === 0)
    return <p className="text-sm text-gray-400 italic text-center py-4">No skills data available.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="text-left px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 border-b dark:border-gray-700 w-48">
              Skill
            </th>
            {candidates.map((c, i) => (
              <th
                key={c.id}
                className="px-4 py-2 font-semibold text-center border-b dark:border-gray-700"
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full ${AVATAR_COLORS[i]} text-white text-xs font-bold flex items-center justify-center`}
                  >
                    {initials(c)}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-300 max-w-20 truncate">
                    {c.first_name}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allSkills.map((skill) => {
            const hasSkill = skillSets.map((s) => s.has(skill));
            const sharedByAll = hasSkill.every(Boolean);
            const sharedBySome = hasSkill.some(Boolean);
            return (
              <tr
                key={skill}
                className={`border-b dark:border-gray-700 ${
                  sharedByAll
                    ? "bg-purple-50 dark:bg-purple-950/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <td className="px-4 py-2 font-medium capitalize">
                  {skill}
                  {sharedByAll && (
                    <span className="ml-2 text-[10px] text-purple-600 font-bold uppercase">
                      shared
                    </span>
                  )}
                </td>
                {hasSkill.map((has, i) => (
                  <td key={i} className="px-4 py-2 text-center">
                    {has ? (
                      <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 mx-auto" />
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Comparison Row ───────────────────────────────────────────────────────────

function CompareRow({
  label,
  values,
  highlight = true,
  suffix = "",
}: {
  label: string;
  values: (string | number | null | undefined)[];
  highlight?: boolean;
  suffix?: string;
}) {
  const normalized = values.map((v) => String(v ?? "—").trim());
  const allSame = normalized.every((v) => v === normalized[0]);
  const isDiff = highlight && !allSame;

  return (
    <tr className={isDiff ? "bg-amber-50 dark:bg-amber-950/20" : "even:bg-gray-50 dark:even:bg-gray-800/30"}>
      <td className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-40 border-r dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 whitespace-nowrap">
        {label}
      </td>
      {normalized.map((val, i) => (
        <td
          key={i}
          className={`px-4 py-3 text-sm border-r last:border-r-0 dark:border-gray-700 ${
            isDiff ? "font-semibold text-amber-800 dark:text-amber-300" : "text-gray-700 dark:text-gray-200"
          }`}
        >
          <span>{val}{val !== "—" && suffix ? ` ${suffix}` : ""}</span>
          {isDiff && val !== "—" && (
            <span className="ml-1.5 text-amber-400 text-xs">≠</span>
          )}
        </td>
      ))}
    </tr>
  );
}

// ─── Main CompareView ─────────────────────────────────────────────────────────

interface Props {
  candidates: CandidateList[];
}

export default function CompareView({ candidates: initialCandidates }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selected, addCandidate, removeCandidate, clearAll } = useCompareStore();
  const [copied, setCopied] = useState(false);
  const { toPDF, targetRef } = usePDF({
    filename: `vaspp-candidate-comparison.pdf`,
    page: { margin: 20 },
  });

  // Sync initial candidates from props to store on mount
  useEffect(() => {
    if (initialCandidates.length > 0 && selected.length === 0) {
      initialCandidates.forEach(c => addCandidate(c));
    }
  }, [initialCandidates, addCandidate, selected.length]);

  // Sync store changes to URL
  useEffect(() => {
    const ids = selected.map(c => c.id).join(",");
    const currentIds = searchParams.get("ids") || "";
    if (ids !== currentIds && selected.length > 0) {
      router.replace(`/candidates/compare?ids=${ids}`, { scroll: false });
    }
  }, [selected, router, searchParams]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Comparison link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const currentCandidates = selected.length > 0 ? selected : initialCandidates;

  if (currentCandidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <GitCompareArrows className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500 text-lg font-medium">No candidates to compare</p>
        <p className="text-gray-400 text-sm">
          Select candidates to compare side-by-side.
        </p>
        <div className="flex items-center gap-3 mt-4">
          <Button variant="outline" onClick={() => router.push("/candidates")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Candidates
          </Button>
        </div>
      </div>
    );
  }

  const showVenn = currentCandidates.length === 2;

  // Use currentCandidates for all rendering below
  const candidates = currentCandidates; 

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-blue-600" />
              Candidate Comparison
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Comparing {candidates.length} candidate{candidates.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Share Link"}
          </Button> */}
          <Button
            size="sm"
            onClick={() => toPDF()}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div ref={targetRef} className="space-y-6">

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `160px repeat(${candidates.length}, 1fr)` }}
        >
          <div /> 
          {candidates.map((c, i) => (
            <div
              key={c.id}
              className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl p-4 shadow-sm relative group"
            >
              <button
                onClick={() => removeCandidate(c.id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-500 flex items-center justify-center transition-colors shadow-sm bg-white dark:bg-gray-800 border dark:border-gray-700"
                title="Remove from comparison"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex flex-col items-center text-center gap-2">
                <div
                  className={`w-12 h-12 rounded-full ${AVATAR_COLORS[i]} text-white text-lg font-bold flex items-center justify-center shadow`}
                >
                  {initials(c)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                    {fullName(c)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.current_title || "—"}
                  </p>
                </div>
                {c.status && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.status.toLowerCase() === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Profile Comparison
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 mr-1 align-middle" />
              Highlighted rows indicate differences
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <colgroup>
                <col className="w-40" />
                {candidates.map((c) => (
                  <col key={c.id} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="px-4 py-2.5 text-left bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700" />
                  {candidates.map((c, i) => (
                    <th
                      key={c.id}
                      className={`px-4 py-2.5 text-sm font-bold text-left border-r last:border-r-0 dark:border-gray-700 ${AVATAR_COLORS[i].replace("bg-", "text-")}`}
                    >
                      {c.first_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                <CompareRow
                  label="Email"
                  values={candidates.map((c) => c.email)}
                />
                <CompareRow
                  label="Role"
                  values={candidates.map((c) => c.current_title)}
                />
                <CompareRow
                  label="Company"
                  values={candidates.map((c) => c.current_company)}
                />
                <CompareRow
                  label="Location"
                  values={candidates.map((c) => c.location)}
                />
                <CompareRow
                  label="Experience"
                  values={candidates.map((c) => c.years_of_experience)}
                  suffix="yrs"
                />
                <CompareRow
                  label="Status"
                  values={candidates.map((c) => c.status)}
                />
                <CompareRow
                  label="LinkedIn"
                  values={candidates.map((c) => c.linkedin_url)}
                  highlight={false}
                />
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Skills Overlap
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {showVenn
                ? "Venn diagram of unique and shared skills"
                : "Skills matrix across all candidates"}
            </p>
          </div>
          <div className="p-5">
            {showVenn ? (
              <SkillsVenn candidates={candidates}/>
            ) : (
              <SkillsMatrix candidates={candidates} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
