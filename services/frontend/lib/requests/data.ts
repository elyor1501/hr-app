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

export async function getRequests(
  page: number = 1,
  limit: number = 10
): Promise<RequestItem[]> {
  const apiUrl = getApiUrl();
  const token = getAuthToken();

  const skip = (page - 1) * limit;

  try {
    const res = await fetch(
      `${apiUrl}/api/v1/requests?skip=${skip}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch requests: ${res.status}`);
    }

    const data = await res.json();

    return Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
  } catch (error) {
    console.error("getRequests error:", error);
    return [];
  }
}

export async function getRequestById(id: string): Promise<RequestItem | null> {
  const apiUrl = getApiUrl();
  const token = getAuthToken();

  try {
    const res = await fetch(`${apiUrl}/api/v1/requests/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch request: ${res.status}`);
    }

    const data = await res.json();

    return data?.data ?? data ?? null;
  } catch (error) {
    console.error("getRequestById error:", error);
    return null;
  }
}