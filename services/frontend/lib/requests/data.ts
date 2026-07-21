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
  feedback_date?: string;
  customer_feedback?: string | null;
  contract_status: boolean;
  state: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  candidate_count: number;
  sap_email?: string | null;
  sap_cuser?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  num_candidates?: number | null;
  num_proposed_candidates?: number | null;
  duration_of_request?: string | null;
  proposed_candidates?: any[];
};

export async function getRequests(
  page: number = 1,
  limit: number = 10,
  q?: string,
  dateFrom?: string,
  dateTo?: string,
  sortBy?: string,
  sortOrder?: string,
  requestNumber?: string,
  company?: string
): Promise<RequestItem[]> {
  const apiUrl = getApiUrl();
  const token = getAuthToken();

  const skip = (page - 1) * limit;
  const queryParams = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });
  if (q) queryParams.set("q", q);
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);
  if (sortBy) queryParams.set("sortBy", sortBy);
  if (sortOrder) queryParams.set("sortOrder", sortOrder);
  if (requestNumber) queryParams.set("requestNumber", requestNumber);
  if (company) queryParams.set("company", company);
  const url = `${apiUrl}/api/v1/requests?${queryParams.toString()}`;
  try {
    const res = await fetch(
      `${apiUrl}/api/v1/requests?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        next: { revalidate: 300 },
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
      next: { revalidate: 300 },
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