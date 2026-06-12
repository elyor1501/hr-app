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

export default function RequestDetails({
  id,
  requestData,
  candidateData,
}: Props) {
  const [request, setRequest] = useState<any>(requestData);
  const [candidates] = useState<any[]>(candidateData);
  const [matches, setMatches] = useState<any[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchStatus, setMatchStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [proposedDateError, setProposedDateError] = useState<string>("");
  const [proposedDateValue, setProposedDateValue] = useState<string>(
    request?.proposed_date ? request.proposed_date.split("T")[0] : ""
  );
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [requestedRate, setRequestedRate] = useState<string>(
    request?.prepared_rate?.toString() ?? "",
  );
  const [requestedRateType, setRequestedRateType] = useState<string>("hourly");
  const [requestedCurrency, setRequestedCurrency] = useState<string>("EUR");
  const [proposedRate, setProposedRate] = useState<string>(
    request?.final_rate?.toString() ?? "",
  );
  const [proposedRateType, setProposedRateType] = useState<string>("daily");
  const [proposedCurrency, setProposedCurrency] = useState<string>("EUR");

  const calculateDailyRate = (amount: string, rateType: string): number | null => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return null;
    if (rateType === "hourly") return val * 8;
    if (rateType === "daily") return val;
    if (rateType === "weekly") return val / 5;
    if (rateType === "monthly") return val / 22;
    return null;
  };

  const requestedDailyRate = calculateDailyRate(requestedRate, requestedRateType);
  const proposedDailyRate = calculateDailyRate(proposedRate, proposedRateType);

  const router = useRouter();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") || localStorage.getItem("token") || ""
      : "";

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const getMinProposedDate = () => {
    const today = getTodayString();
    const requestDate = request?.request_date
      ? request.request_date.split("T")[0]
      : today;
    return requestDate > today ? requestDate : today;
  };

  const validateProposedDate = (value: string): string => {
    if (!value) return "";
    const today = getTodayString();
    const requestDate = request?.request_date
      ? request.request_date.split("T")[0]
      : today;
    if (value < today) {
      return "Proposed date cannot be in the past";
    }
    if (value < requestDate) {
      return "Proposed date cannot be before request date";
    }
    return "";
  };

  const handleProposedDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setProposedDateValue(value);
    const error = validateProposedDate(value);
    setProposedDateError(error);
  };

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
        const sorted = [...data.result.matches].sort(
          (a: any, b: any) => b.match_score - a.match_score,
        );
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
        body: JSON.stringify({ top_k: 10, min_score: 0, auto_propose: false, force_refresh: forceRefresh }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      if (data.result?.matches) {
        const sorted = [...data.result.matches].sort(
          (a: any, b: any) => b.match_score - a.match_score,
        );
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
    if (proposedDateError) {
      toast.error(proposedDateError);
      return;
    }

    if (proposedDateValue) {
      const error = validateProposedDate(proposedDateValue);
      if (error) {
        toast.error(error);
        setProposedDateError(error);
        return;
      }
    }

    setSaving(true);
    try {
      await updateRequest(formData);
      const updatedRequest = await getRequestById(id);
      setRequest(updatedRequest);
      setProposedDateValue(
        updatedRequest?.proposed_date
          ? updatedRequest.proposed_date.split("T")[0]
          : ""
      );
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

  if (!request)
    return <p className="text-muted-foreground">Loading request details...</p>;

  const fieldClass =
    "w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground disabled:bg-muted disabled:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="max-w-6xl mx-auto bg-card text-card-foreground rounded-xl shadow-sm border border-border p-8">
      <form
        key={request.request_date + request.proposed_date}
        id="request-form"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSubmit(formData);
        }}
        className="grid grid-cols-1 md:grid-cols-1 gap-10"
      >
        <input type="hidden" name="id" value={request.id} />
        <input type="hidden" name="request_date" value={request.request_date ? request.request_date.split("T")[0] : ""} />

        <div className="space-y-6">
          <div className="flex justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Request Details</h2>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: "#429ABD" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5A623")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#429ABD")}
              >
                Edit
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Request Number</label>
              <input
                name="request_number"
                defaultValue={request.request_number ?? ""}
                disabled={!isEditing}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Request Status</label>
              <select
                name="state"
                value={request?.state ?? "open"}
                onChange={(e) => setRequest((prev: any) => ({ ...prev, state: e.target.value }))}
                disabled={!isEditing}
                className={fieldClass}
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
              <label className="block text-sm font-medium mb-1 text-foreground">Request Title</label>
              <input
                name="request_title"
                defaultValue={request.request_title}
                disabled={!isEditing}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Contract Status</label>
              <select
                name="contract_status"
                defaultValue={String(request.contract_status)}
                disabled={!isEditing || request.state !== "signed"}
                className={fieldClass}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              {request.state !== "signed" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Contract can only be activated when request is signed
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Company Name</label>
            <input
              name="company_name"
              defaultValue={request.company_name ?? ""}
              disabled={!isEditing}
              className={fieldClass}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3 border border-border rounded-lg p-4">
              <p className="text-sm font-semibold text-foreground">Requested Rate</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Rate Amount</label>
                  <input
                    type="number"
                    name="prepared_rate"
                    value={requestedRate}
                    onChange={(e) => setRequestedRate(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Not set"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Rate Type</label>
                  <select
                    name="requested_rate_type"
                    value={requestedRateType}
                    onChange={(e) => setRequestedRateType(e.target.value)}
                    disabled={!isEditing}
                    className={fieldClass}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Currency</label>
                  <select
                    name="requested_currency"
                    value={requestedCurrency}
                    onChange={(e) => setRequestedCurrency(e.target.value)}
                    disabled={!isEditing}
                    className={fieldClass}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Daily Rate (auto)</label>
                  <input
                    type="text"
                    disabled
                    value={requestedDailyRate !== null ? `${requestedCurrency} ${requestedDailyRate.toFixed(2)}` : "Not set"}
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 border border-border rounded-lg p-4">
              <p className="text-sm font-semibold text-foreground">Proposed Rate</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Rate Amount</label>
                  <input
                    type="number"
                    name="final_rate"
                    value={proposedRate}
                    onChange={(e) => setProposedRate(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Not set"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Rate Type</label>
                  <select
                    name="proposed_rate_type"
                    value={proposedRateType}
                    onChange={(e) => setProposedRateType(e.target.value)}
                    disabled={!isEditing}
                    className={fieldClass}
                  >
                    <option value="daily">Daily</option>
                    <option value="hourly">Hourly</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Currency</label>
                  <select
                    name="proposed_currency"
                    value={proposedCurrency}
                    onChange={(e) => setProposedCurrency(e.target.value)}
                    disabled={!isEditing}
                    className={fieldClass}
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Daily Rate (auto)</label>
                  <input
                    type="text"
                    disabled
                    value={proposedDailyRate !== null ? `${proposedCurrency} ${proposedDailyRate.toFixed(2)}` : "Not set"}
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Request Date
              </label>
              <input
                type="date"
                value={request.request_date ? request.request_date.split("T")[0] : ""}
                disabled
                className={fieldClass}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Proposed Date
              </label>
              <input
                type="date"
                name="proposed_date"
                value={proposedDateValue}
                min={isEditing ? getMinProposedDate() : undefined}
                onChange={handleProposedDateChange}
                disabled={!isEditing}
                className={`${fieldClass} ${proposedDateError ? "border-red-500 focus:ring-red-500" : ""}`}
              />
              {proposedDateError && isEditing && (
                <p className="text-xs text-red-500 mt-1">{proposedDateError}</p>
              )}
              {isEditing && !proposedDateError && (
                <p className="text-xs text-muted-foreground mt-1">
                  Must be today or a future date and not before request date
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Job Description</label>
            <textarea
              name="job_description"
              rows={4}
              defaultValue={request.job_description ?? ""}
              disabled={!isEditing}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Customer Feedback</label>
            <textarea
              name="customer_feedback"
              rows={3}
              defaultValue={request.customer_feedback ?? ""}
              disabled={!isEditing}
              className={fieldClass}
            />
          </div>
        </div>
      </form>

      {isEditing && (
        <div className="flex justify-end mt-8 gap-3">
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setProposedDateError("");
              setProposedDateValue(
                request?.proposed_date ? request.proposed_date.split("T")[0] : ""
              );
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-300 hover:shadow-lg"
            style={{ backgroundColor: "#6B7280" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#4B5563")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#6B7280")}
          >
            Cancel
          </button>
          <button
            form="request-form"
            type="submit"
            disabled={saving || !!proposedDateError}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: saving ? "#94A3B8" : "#429ABD" }}
            onMouseEnter={(e) => { if (!saving && !proposedDateError) e.currentTarget.style.backgroundColor = "#F5A623"; }}
            onMouseLeave={(e) => { if (!saving && !proposedDateError) e.currentTarget.style.backgroundColor = "#429ABD"; }}
          >
            {saving ? "Updating..." : "Update"}
          </button>
        </div>
      )}

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Matching Candidates ({matches.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => runCandidateMatching(false)}
              disabled={matching}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg"
              style={{ backgroundColor: matching ? "#94A3B8" : "#429ABD" }}
              onMouseEnter={(e) => { if (!matching) e.currentTarget.style.backgroundColor = "#F5A623"; }}
              onMouseLeave={(e) => { if (!matching) e.currentTarget.style.backgroundColor = "#429ABD"; }}
            >
              {matching ? "Matching..." : "Find Matching Candidates"}
            </button>
            {matches.length > 0 && (
              <button
                onClick={() => runCandidateMatching(true)}
                disabled={matching}
                className="px-3 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: "#429ABD" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5A623")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#429ABD")}
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {matching && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {matchStatus || "Matching in progress..."}
            </p>
          </div>
        )}

        {matches.length === 0 && !matching ? (
          <p className="text-muted-foreground">No matching candidates found. Click the button above.</p>
        ) : (
          <div className="grid gap-4">
            {matches.map((candidate) => (
              <div key={candidate.candidate_id} className="border border-border rounded-lg p-5 shadow-sm space-y-3 bg-card">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">
                      {candidate.first_name} {candidate.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {candidate.current_title || "N/A"}{" "}
                      {candidate.current_company ? `@ ${candidate.current_company}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {candidate.location || ""}{" "}
                      {candidate.email ? `• ${candidate.email}` : ""}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    candidate.match_score >= 70
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : candidate.match_score >= 40
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  }`}>
                    {candidate.match_score}% Match
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">{candidate.reasoning}</p>

                {candidate.strengths && candidate.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Strengths</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {candidate.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {candidate.gaps && candidate.gaps.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Gaps</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {candidate.gaps.map((g: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground">{g}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {candidate.skills_comparison && (
                  <div className="grid grid-cols-2 gap-3">
                    {candidate.skills_comparison.matching_skills?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Matching Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills_comparison.matching_skills.map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {candidate.skills_comparison.candidate_skills?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Candidate Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills_comparison.candidate_skills.slice(0, 10).map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {candidate.hourly_rate && (
                  <p className="text-xs text-muted-foreground">Rate: €{candidate.hourly_rate}/hr</p>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => router.push(`/candidates/${candidate.candidate_id}`)}
                    className="px-4 py-1.5 text-sm text-white rounded-md transition-all duration-300 hover:shadow-lg"
                    style={{ backgroundColor: "#429ABD" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5A623")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#429ABD")}
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