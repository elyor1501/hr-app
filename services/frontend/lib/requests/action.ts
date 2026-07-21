import { getApiUrl, getAuthToken } from "../api-config";
import { revalidateRequest } from "./revalidate";

export async function deleteRequest(requestId: string, token: string | null) {
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/v1/requests/${requestId}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Delete failed:", text);
      throw new Error("Failed to delete request");
    }

    await revalidateRequest();

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function updateRequest(formData: FormData): Promise<void> {
  const id = formData.get("id") as string;
  const apiUrl = getApiUrl();
  const token = getAuthToken();

  const payload = {
    company_name: formData.get("company_name"),
    contact_person: formData.get("contact_person") || null,
    contact_phone: formData.get("contact_phone") || null,
    request_title: formData.get("request_title"),
    state: formData.get("state"),
    job_description: formData.get("job_description"),
    prepared_rate: formData.get("prepared_rate")
      ? Number(formData.get("prepared_rate"))
      : null,
    final_rate: formData.get("final_rate")
      ? Number(formData.get("final_rate"))
      : null,
    proposed_date: formData.get("proposed_date") || null,
    feedback_date: formData.get("feedback_date") || null,

    duration_of_request: formData.get("duration_of_request") || null,

    num_candidates: formData.get("num_candidates")
      ? Number(formData.get("num_candidates"))
      : null,

    num_proposed_candidates: formData.get("num_proposed_candidates")
      ? Number(formData.get("num_proposed_candidates"))
      : null,
    customer_feedback: formData.get("customer_feedback") || null,
    contract_status: formData.get("contract_status") === "true",
    sap_email: formData.get("sap_email") || null,
    sap_cuser: formData.get("sap_cuser") || null,
  };

  const res = await fetch(`${apiUrl}/api/v1/requests/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    let errorMessage = "Failed to update request";
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch (e) {
      errorMessage = text || errorMessage;
    }
    console.error("Update failed:", text);
    throw new Error("Failed to update request");
  }

  await revalidateRequest(id);
}
