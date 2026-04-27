"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateRequest } from "@/lib/requests/action";
import { getRequestById } from "@/lib/requests/data";

type Props = {
  id: string;
  requestData: any;
  candidateData: any[];
};

export default function RequestDetails({
  id,
  requestData,
  candidateData,
}: Props) {
  const [request, setRequest] = useState<any>(requestData);
  const [candidates] = useState<any[]>(candidateData);
  const [matches, setMatches] = useState<any[]>([]);
  const [matching, setMatching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const router = useRouter();

  async function runCandidateMatching() {
    if (!candidates || candidates.length === 0) return;

    setMatching(true);
    try {
      const candidateIds = candidates.map((c: any) => c.resume_id);

      const res = await fetch(`/api/match/${id}`, {
        method: "POST",
        body: JSON.stringify({ candidateIds }),
      });

      const matchData = await res.json();

      const topMatches = matchData.results
        .sort((a: any, b: any) => b.match_score - a.match_score)
        .slice(0, 10);

      setMatches(topMatches);
    } catch (error) {
      console.error("Matching error:", error);
    }
    setMatching(false);
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
              <label className="block text-sm font-medium mb-1">
                Request Number
              </label>
              <input
                name="request_number"
                defaultValue={request.request_number ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                name="state"
                defaultValue={request.state ?? "open"}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Request Title
              </label>
              <input
                name="request_title"
                defaultValue={request.request_title}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Contract Status
              </label>
              <select
                name="contract_status"
                defaultValue={String(request.contract_status)}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div>
              <label className="block text-sm font-medium mb-1">
                Company Name
              </label>
              <input
                name="company_name"
                defaultValue={request.company_name ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Prepared Rate
              </label>
              <input
                type="number"
                name="prepared_rate"
                defaultValue={request.prepared_rate ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Final Rate
              </label>
              <input
                type="number"
                name="final_rate"
                defaultValue={request.final_rate ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Request Date
              </label>
              <input
                type="date"
                name="request_date"
                defaultValue={request.request_date ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Proposed Date
              </label>
              <input
                type="date"
                name="proposed_date"
                defaultValue={request.proposed_date ?? ""}
                disabled={!isEditing}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Job Description
            </label>
            <textarea
              name="job_description"
              rows={4}
              defaultValue={request.job_description ?? ""}
              disabled={!isEditing}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Customer Feedback
            </label>
            <textarea
              name="customer_feedback"
              rows={3}
              defaultValue={request.customer_feedback ?? ""}
              disabled={!isEditing}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
            />
          </div>
        </div>
      </form>

      {isEditing && (
        <div className="flex justify-end mt-8 gap-3">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            form="request-form"
            type="submit"
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm ${
              saving
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {saving ? "Updating..." : "Update"}
          </button>
        </div>
      )}


      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            Matching Candidates ({matches.length})
          </h2>
          <button
            // onClick={runCandidateMatching}
            disabled={matching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {matching ? "Matching..." : "Find Matching Candidates"}
          </button>
        </div>

        {matches.length === 0 ? (
          <p className="text-gray-500">
            No matching candidates found. Click the button above.
          </p>
        ) : (
          <div className="grid gap-4">
            {matches.map((candidate) => (
              <div
                key={candidate.candidate_id}
                className="border rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between mb-2">
                  <h3 className="font-semibold">
                    {candidate.candidate_name || "Candidate"}
                  </h3>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                    {Number(candidate.match_score).toFixed(2)}%
                  </span>
                </div>

                <p className="text-sm text-gray-600">{candidate.reasoning}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
