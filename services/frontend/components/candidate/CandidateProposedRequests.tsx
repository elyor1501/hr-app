"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api-config";

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
  const router = useRouter();

  const stateColors: Record<string, string> = {
    open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    in_progress:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    signed:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    closed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  };

  useEffect(() => {
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
    fetchAll();
  }, [candidateId]);

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

  const hasNothing = attached.length === 0 && topMatching.length === 0;

  if (hasNothing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">No requests yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            This candidate has not been attached to any request.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-2">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Attached Requests
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Requests this candidate has been attached to
            </p>
          </div>
          {attached.length > 0 && (
            <span
              className="px-2.5 py-1 text-xs font-bold rounded-full"
              style={{ backgroundColor: "#429ABD20", color: "#429ABD" }}
            >
              {attached.length}
            </span>
          )}
        </div>

        {attached.length === 0 ? (
          <div className="flex items-center justify-center py-8 rounded-xl border border-dashed border-border bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Not attached to any request yet
            </p>
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
                  <span
                    className="text-xs font-bold"
                    style={{ color: "#429ABD" }}
                  >
                    {req.request_number}
                  </span>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {req.request_title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.company_name}
                  </p>
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
            <h3 className="text-base font-semibold text-foreground">
              Top Matching Requests
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top 3 AI matched requests
            </p>
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
              Go to any request and click "Find Matching Candidates" to generate
              AI scores.
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
                  <span
                    className="text-xs font-bold"
                    style={{ color: "#F5A623" }}
                  >
                    {req.request_number}
                  </span>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {req.request_title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.company_name}
                  </p>
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
