"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api-config";

type ProposedRequest = {
  id: string;
  request_number: string;
  request_title: string;
  company_name: string;
  state: string;
  proposed_date: string | null;
};

export default function CandidateProposedRequests({ candidateId }: { candidateId: string }) {
  const [requests, setRequests] = useState<ProposedRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const stateColors: Record<string, string> = {
    open: "bg-green-100 text-green-700",
    in_progress: "bg-blue-100 text-blue-700",
    signed: "bg-purple-100 text-purple-700",
    closed: "bg-gray-100 text-gray-700",
  };

  useEffect(() => {
    const fetch_requests = async () => {
      try {
        const apiUrl = getApiUrl();
        const token = localStorage.getItem("access_token") || "";
        const res = await fetch(`${apiUrl}/api/v1/candidates/${candidateId}/requests?page=1&page_size=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setRequests(data.items || []);
        setTotal(data.total || 0);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetch_requests();
  }, [candidateId]);

  if (loading) return null;
  if (total === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">Proposed Requests</h3>
        <span className="px-2 py-0.5 text-xs font-bold rounded-full" style={{ backgroundColor: "#429ABD20", color: "#429ABD" }}>
          {total}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {requests.map((req) => (
          <button
            key={req.id}
            onClick={() => router.push(`/requests/${req.id}`)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 hover:shadow-md ${stateColors[req.state] || "bg-muted text-muted-foreground"}`}
            title={`${req.request_title} - ${req.company_name}`}
          >
            {req.request_number}
          </button>
        ))}
        {total > 10 && (
          <span className="px-3 py-1.5 text-xs text-muted-foreground">
            +{total - 10} more
          </span>
        )}
      </div>
    </div>
  );
}