"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api-config";
import { X, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

type RequestItem = {
  id: string;
  request_number: string;
  request_title: string;
  company_name: string;
  state: string;
  match_score: number;
  is_proposed: boolean;
  proposed_date: string | null;
};

export default function CandidateProposedRequests({
  candidateId,
}: {
  candidateId: string;
}) {
  const [allRequests, setAllRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAttachDialog, setShowAttachDialog] = useState(false);
  const [attachSearch, setAttachSearch] = useState("");
  const [attachResults, setAttachResults] = useState<any[]>([]);
  const [attachSearching, setAttachSearching] = useState(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const router = useRouter();

  const stateColors: Record<string, string> = {
    open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    signed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    closed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  };

  const fetchAll = async () => {
    try {
      const apiUrl = getApiUrl();
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(
        `${apiUrl}/api/v1/candidates/${candidateId}/requests?page=1&page_size=20`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;
      const data = await res.json();
      setAllRequests(data.items || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [candidateId]);

  useEffect(() => {
    if (!attachSearch.trim()) {
      setAttachResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setAttachSearching(true);
      try {
        const apiUrl = getApiUrl();
        const token = localStorage.getItem("access_token") || "";
        const res = await fetch(
          `${apiUrl}/api/v1/requests/?q=${encodeURIComponent(attachSearch)}&limit=10`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        setAttachResults(Array.isArray(data) ? data : (data.items || []));
      } catch {
      } finally {
        setAttachSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [attachSearch]);

  async function handleAttachRequest(requestId: string) {
    setAttachingId(requestId);
    try {
      const apiUrl = getApiUrl();
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(
        `${apiUrl}/api/v1/requests/${requestId}/candidates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ candidate_id: candidateId }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.detail && err.detail.includes("already proposed")) {
          toast.info("Candidate already attached to this request");
        } else {
          toast.error(err.detail || "Failed to attach to request");
        }
        return;
      }
      toast.success("Candidate attached to request successfully");
      setShowAttachDialog(false);
      setAttachSearch("");
      setAttachResults([]);
      setLoading(true);
      await fetchAll();
    } catch {
      toast.error("Failed to attach to request");
    } finally {
      setAttachingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <div className="w-6 h-6 border-2 border-[#429ABD] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading requests...</p>
      </div>
    );
  }

  const attached = allRequests.filter((r) => r.is_proposed);
  const topMatching = allRequests
    .filter(
      (r) =>
        !r.is_proposed &&
        r.match_score > 0 &&
        r.state !== "closed" &&
        r.state !== "signed",
    )
    .slice(0, 3);

  const attachedIds = new Set(attached.map((r) => r.id));

  return (
    <div className="space-y-8 pt-2">
      {showAttachDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold" style={{ color: "#429ABD" }}>
                Attach Candidate to Request
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAttachDialog(false);
                  setAttachSearch("");
                  setAttachResults([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={attachSearch}
                onChange={(e) => setAttachSearch(e.target.value)}
                placeholder="Search by request title, number or company..."
                className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#429ABD]"
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {attachSearching && (
                <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
              )}
              {!attachSearching && attachSearch && attachResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No requests found</p>
              )}
              {!attachSearching && !attachSearch && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Type to search requests...
                </p>
              )}
              {!attachSearching &&
                attachResults.map((r: any) => {
                  const alreadyAttached = attachedIds.has(r.id);
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold" style={{ color: "#429ABD" }}>
                          {r.request_number}
                        </p>
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.request_title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.company_name}
                          {r.state && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${stateColors[r.state] || ""}`}>
                              {r.state.replace("_", " ")}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyAttached || attachingId === r.id}
                        onClick={() => handleAttachRequest(r.id)}
                        className="ml-3 px-3 py-1.5 text-xs text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0"
                        style={{ backgroundColor: alreadyAttached ? "#94A3B8" : "#429ABD" }}
                        onMouseEnter={(e) => {
                          if (!alreadyAttached) e.currentTarget.style.backgroundColor = "#F5A623";
                        }}
                        onMouseLeave={(e) => {
                          if (!alreadyAttached) e.currentTarget.style.backgroundColor = "#429ABD";
                        }}
                      >
                        {alreadyAttached ? "Attached" : attachingId === r.id ? "Attaching..." : "Attach"}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Attached Requests</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Requests this candidate has been attached to
            </p>
          </div>
          <div className="flex items-center gap-2">
            {attached.length > 0 && (
              <span
                className="px-2.5 py-1 text-xs font-bold rounded-full"
                style={{ backgroundColor: "#429ABD20", color: "#429ABD" }}
              >
                {attached.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowAttachDialog(true)}
              className="px-3 py-1.5 text-xs text-white rounded-lg transition-all duration-300 flex items-center gap-1.5"
              style={{ backgroundColor: "#429ABD" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5A623")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#429ABD")}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Attach to Request
            </button>
          </div>
        </div>

        {attached.length === 0 ? (
          <div className="flex items-center justify-center py-8 rounded-xl border border-dashed border-border bg-muted/20">
            <p className="text-sm text-muted-foreground">Not attached to any request yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attached.map((req) => (
              <div
                key={req.id}
                onClick={() => router.push(`/requests/${req.id}`)}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:shadow-sm cursor-pointer transition-all duration-200"
                style={{ borderLeftWidth: "3px", borderLeftColor: "#429ABD" }}
              >
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-xs font-bold" style={{ color: "#429ABD" }}>
                    {req.request_number}
                  </span>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {req.request_title}
                  </p>
                  <p className="text-xs text-muted-foreground">{req.company_name}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${stateColors[req.state] || "bg-muted text-muted-foreground"}`}
                  >
                    {req.state.replace("_", " ")}
                  </span>
                  {req.match_score > 0 && (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{ backgroundColor: "#429ABD20", color: "#429ABD" }}
                    >
                      {req.match_score}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Top Matching Requests</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Top 3 AI matched requests</p>
          </div>
          {topMatching.length > 0 && (
            <span
              className="px-2.5 py-1 text-xs font-bold rounded-full"
              style={{ backgroundColor: "#F5A62320", color: "#F5A623" }}
            >
              {topMatching.length}
            </span>
          )}
        </div>

        {topMatching.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-border bg-muted/20 gap-2">
            <p className="text-sm text-muted-foreground">No AI matches yet</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Go to any request and click "Find Matching Candidates" to generate AI scores.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topMatching.map((req) => (
              <div
                key={req.id}
                onClick={() => router.push(`/requests/${req.id}`)}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:shadow-sm cursor-pointer transition-all duration-200"
                style={{ borderLeftWidth: "3px", borderLeftColor: "#F5A623" }}
              >
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-xs font-bold" style={{ color: "#F5A623" }}>
                    {req.request_number}
                  </span>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {req.request_title}
                  </p>
                  <p className="text-xs text-muted-foreground">{req.company_name}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${stateColors[req.state] || "bg-muted text-muted-foreground"}`}
                  >
                    {req.state.replace("_", " ")}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: "#F5A62320", color: "#F5A623" }}
                  >
                    {req.match_score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}