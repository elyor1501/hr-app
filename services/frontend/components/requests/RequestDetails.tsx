"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateRequest } from "@/lib/requests/action";
import { getRequestById } from "@/lib/requests/data";
import { EyeIcon } from "lucide-react";

type Props = {
  id: string;
  requestData: any;
  candidateData: any[];
};

export default function RequestDetails({ id, requestData, candidateData }: Props) {
  const [request, setRequest] = useState<any>(requestData);
  const [candidates] = useState<any[]>(candidateData);
  const [matches, setMatches] = useState<any[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchStatus, setMatchStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("token") || sessionStorage.getItem("token") || ""
      : "";

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function pollMatchStatus() {
    try {
      const token = getToken();
      const res = await fetch(`${apiUrl}/api/v1/requests/${id}/auto-match/status`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      if (!res.ok) return;

      const data = await res.json();

      if (data.result?.matches) {
        const sorted = [...data.result.matches].sort((a: any, b: any) => b.match_score - a.match_score);
        setMatches(sorted);
      }

      if (data.status === "completed" && data.result) {
        if (pollRef.current) clearInterval(pollRef.current);
        setMatching(false);
        setMatchStatus("");
        toast.success(`Found ${data.result.total_matches} matching candidates`);
      } else if (data.status === "error") {
        if (pollRef.current) clearInterval(pollRef.current);
        setMatching(false);
        setMatchStatus("");
        toast.error(data.message || "Matching failed");
      } else if (data.status === "processing") {
        setMatchStatus("AI validation in progress...");
      }
    } catch (e) {
      console.error("poll status error:", e);
    }
  }

  async function runCandidateMatching(forceRefresh = false) {
    setMatching(true);
    setMatchStatus("Starting matching process...");

    try {
      const token = getToken();
      const res = await fetch(`${apiUrl}/api/v1/requests/${id}/auto-match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          top_k: 10,
          min_score: 0,
          auto_propose: false,
          force_refresh: forceRefresh,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed: ${res.status}`);
      }

      const data = await res.json();

      if (data.result?.matches) {
        const sorted = [...data.result.matches].sort((a: any, b: any) => b.match_score - a.match_score);
        setMatches(sorted);
      }

      if (data.status === "completed" && data.result) {
        setMatching(false);
        setMatchStatus("");
        toast.success(`Found ${data.result.total_matches} matching candidates (cached)`);
        return;
      }

      setMatchStatus("Preliminary matches ready. AI validation running...");
      toast.info("Preliminary matches loaded instantly. AI is refining results...");

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(pollMatchStatus, 4000);

    } catch (error: any) {
      console.error("Matching error:", error);
      setMatching(false);
      setMatchStatus("");
      toast.error(error?.message || "Matching failed");
    }
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    try {
      await updateRequest(formData);
      const updatedRequest = await getRequestById(id);
      setRequest(updatedRequest);
      setIsEditing(false);
      toast.success("Request updated successfully");
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error?.message || "Failed to update request");
    } finally {
      setSaving(false);
      router.refresh();
    }
  }

  if (!request) return <p>Loading request details...</p>;

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border p-8">
      <form
        id="request-form"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSubmit(formData);
        }}
        className="grid grid-cols-1 md:grid-cols-1 gap-10"
      >
        <input type="hidden" name="id" value={request.id} />

        <div className="space-y-6">
          <div className="flex justify-between mb-6">
            <h2 className="text-lg font-semibold">Request Details</h2>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Edit
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Request Number</label>
              <input name="request_number" defaultValue={request.request_number ?? ""} disabled={!isEditing} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Request Status
              </label>
              <select
                name="state"
                defaultValue={request.state ?? "open"}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="signed">Signed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Request Title</label>
              <input name="request_title" defaultValue={request.request_title} disabled={!isEditing} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Contract Status
              </label>
              <select
                name="contract_status"
                defaultValue={String(request.contract_status)}
                disabled={!isEditing || request.state !== "signed"}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              {request.state !== "signed" && (
                <p className="text-xs text-gray-500 mt-1">
                  Contract can only be activated when request is signed
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input name="company_name" defaultValue={request.company_name ?? ""} disabled={!isEditing} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Prepared Rate</label>
              <input type="number" name="prepared_rate" defaultValue={request.prepared_rate ?? ""} disabled={!isEditing} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Final Rate</label>
              <input type="number" name="final_rate" defaultValue={request.final_rate ?? ""} disabled={!isEditing} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Request Date</label>
              <input type="date" name="request_date" defaultValue={request.request_date ?? ""} disabled={!isEditing} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Proposed Date</label>
              <input type="date" name="proposed_date" defaultValue={request.proposed_date ?? ""} disabled={!isEditing} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Job Description</label>
            <textarea name="job_description" rows={4} defaultValue={request.job_description ?? ""} disabled={!isEditing} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Customer Feedback</label>
            <textarea name="customer_feedback" rows={3} defaultValue={request.customer_feedback ?? ""} disabled={!isEditing} className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
          </div>
        </div>
      </form>

      {isEditing && (
        <div className="flex justify-end mt-8 gap-3">
          <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button form="request-form" type="submit" disabled={saving} className={`px-4 py-2 rounded-lg text-sm ${saving ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
            {saving ? "Updating..." : "Update"}
          </button>
        </div>
      )}

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Matching Candidates ({matches.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={() => runCandidateMatching(false)}
              disabled={matching}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {matching ? "Matching..." : "Find Matching Candidates"}
            </button>
            {matches.length > 0 && (
              <button
                onClick={() => runCandidateMatching(true)}
                disabled={matching}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {matching && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mb-4">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-700">{matchStatus || "Matching in progress..."}</p>
          </div>
        )}

        {matches.length === 0 && !matching ? (
          <p className="text-gray-500">No matching candidates found. Click the button above.</p>
        ) : (
          <div className="grid gap-4">
            {matches.map((candidate) => (
              <div key={candidate.candidate_id} className="border rounded-lg p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{candidate.first_name} {candidate.last_name}</h3>
                    <p className="text-sm text-gray-500">{candidate.current_title || "N/A"} {candidate.current_company ? `@ ${candidate.current_company}` : ""}</p>
                    <p className="text-xs text-gray-400">{candidate.location || ""} {candidate.email ? `• ${candidate.email}` : ""}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${candidate.match_score >= 70 ? "bg-green-100 text-green-700" : candidate.match_score >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                    {candidate.match_score}% Match
                  </span>
                </div>

                <p className="text-sm text-gray-600">{candidate.reasoning}</p>

                {candidate.strengths && candidate.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-1">Strengths</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {candidate.strengths.map((s: string, i: number) => <li key={i} className="text-xs text-gray-600">{s}</li>)}
                    </ul>
                  </div>
                )}

                {candidate.gaps && candidate.gaps.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-1">Gaps</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {candidate.gaps.map((g: string, i: number) => <li key={i} className="text-xs text-gray-600">{g}</li>)}
                    </ul>
                  </div>
                )}

                {candidate.skills_comparison && (
                  <div className="grid grid-cols-2 gap-3">
                    {candidate.skills_comparison.matching_skills?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-blue-700 mb-1">Matching Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills_comparison.matching_skills.map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {candidate.skills_comparison.candidate_skills?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Candidate Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills_comparison.candidate_skills.slice(0, 10).map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {candidate.hourly_rate && (
                  <p className="text-xs text-gray-500">
                    Rate: €{candidate.hourly_rate}/hr
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() =>
                      router.push(`/candidates/${candidate.candidate_id}`)
                    }
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
