import { getApiUrl, getAuthToken } from "../api-config";

export type RequestItem = {
  id: string;
  request_number: string;
  company_name: string;
  request_title: string;
  job_description?: string;
  prepared_rate: number | null;
  final_rate: number | null;
  request_date: string;
  proposed_date?: string;
  customer_feedback?: string | null;
  contract_status: boolean;
  state: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  candidate_count: number;
};

export async function getRequests(): Promise<RequestItem[]> {
  const apiUrl = getApiUrl();
  const token = getAuthToken();
  
  try {
    const res = await fetch(`${apiUrl}/api/v1/requests`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch requests: ${res.status}`);
    }

    const data = await res.json();

    return data?.data ?? data ?? [];
  } catch (error) {
    console.error("getRequests error:", error);
    return [];
  }
}